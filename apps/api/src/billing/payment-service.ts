import { tenantQuery, tenantTransaction } from '../database/tenant-query.js';
import { auditService } from '../audit/audit-service.js';
import {
  PaymentDto,
  CreatePaymentInputDto,
  RefundPaymentInputDto,
  DepositDto,
  CreateDepositInputDto,
  ApplyDepositInputDto,
  WorkOrderFinancialSummaryDto,
} from '@carx/shared';

export class PaymentValidationError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'PaymentValidationError';
    this.statusCode = statusCode;
  }
}

export class PaymentExcessiveAmountError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 422) {
    super(message);
    this.name = 'PaymentExcessiveAmountError';
    this.statusCode = statusCode;
  }
}

export class PaymentNotFoundError extends Error {
  statusCode: number;
  constructor(message = 'Pagamento não encontrado.', statusCode = 404) {
    super(message);
    this.name = 'PaymentNotFoundError';
    this.statusCode = statusCode;
  }
}

export class PaymentService {
  // ============================================================================
  // 1. LIQUIDAÇÃO E PAGAMENTO DE ORDEM DE SERVIÇO (TRANSAÇÃO ATÔMICA ANTI-RACE CONDITION)
  // ============================================================================

  /**
   * Registra um pagamento para a Ordem de Serviço em transação com lock pessimista (FOR UPDATE)
   * Critério de aceite: Teste de concorrência disparando duas liquidações simultâneas soma corretamente
   * e pagamento acima do saldo devedor é recusado.
   */
  async processWorkOrderPayment(
    tenantId: string,
    workOrderId: string,
    input: CreatePaymentInputDto,
    actorUserId?: string
  ): Promise<PaymentDto> {
    if (!input.amountCents || input.amountCents <= 0) {
      throw new PaymentValidationError('O valor do pagamento deve ser estritamente maior que zero.');
    }

    let createdPayment: PaymentDto;

    await tenantTransaction(tenantId, async (client) => {
      // 1. Lock pessimista na OS para serializar qualquer concorrência
      const woRes = await client.query<{
        id: string;
        os_number: number;
        status: string;
        final_cents: number;
        paid_cents: number;
      }>(
        `
        SELECT id, os_number, status, final_cents, paid_cents 
        FROM work_orders 
        WHERE tenant_id = $1 AND id = $2 
        FOR UPDATE;
        `,
        [tenantId, workOrderId]
      );

      if (woRes.rows.length === 0) {
        throw new PaymentNotFoundError('Ordem de serviço não encontrada nesta oficina.');
      }

      const wo = woRes.rows[0];

      if (wo.status === 'CANCELED') {
        throw new PaymentValidationError('Não é permitido registrar pagamentos para uma Ordem de Serviço cancelada.', 422);
      }

      const currentPaid = wo.paid_cents || 0;
      const finalValue = wo.final_cents || 0;
      const remainingCents = Math.max(0, finalValue - currentPaid);

      // 2. Validação estrita: Não permite pagar acima do saldo restante
      if (input.amountCents > remainingCents) {
        const remainingReais = (remainingCents / 100).toFixed(2);
        const attemptedReais = (input.amountCents / 100).toFixed(2);
        throw new PaymentExcessiveAmountError(
          `Valor do pagamento (R$ ${attemptedReais}) excede o saldo restante devedor da Ordem de Serviço (R$ ${remainingReais}).`
        );
      }

      // 3. Inserir pagamento
      const payRes = await client.query<PaymentDto>(
        `
        INSERT INTO payments (
          tenant_id,
          work_order_id,
          amount_cents,
          method,
          status,
          installments,
          card_brand,
          transaction_reference,
          notes,
          received_by
        ) VALUES ($1, $2, $3, $4, 'approved', $5, $6, $7, $8, $9)
        RETURNING 
          id,
          tenant_id AS "tenantId",
          work_order_id AS "workOrderId",
          amount_cents AS "amountCents",
          method,
          status,
          installments,
          card_brand AS "cardBrand",
          transaction_reference AS "transactionReference",
          notes,
          refunded_amount_cents AS "refundedAmountCents",
          refund_reason AS "refundReason",
          refunded_at AS "refundedAt",
          refunded_by AS "refundedBy",
          received_by AS "receivedBy",
          created_at AS "createdAt",
          updated_at AS "updatedAt";
        `,
        [
          tenantId,
          workOrderId,
          input.amountCents,
          input.method,
          input.installments || 1,
          input.cardBrand || null,
          input.transactionReference || null,
          input.notes || null,
          actorUserId || null,
        ]
      );
      createdPayment = payRes.rows[0];

      // 4. Atualizar paid_cents na OS atomicamente
      const newPaidCents = currentPaid + input.amountCents;
      await client.query(
        `
        UPDATE work_orders 
        SET 
          paid_cents = $3,
          updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2;
        `,
        [tenantId, workOrderId, newPaidCents]
      );

      // 5. Inserir evento na linha do tempo da OS
      await client.query(
        `
        INSERT INTO work_order_events (
          tenant_id,
          work_order_id,
          user_id,
          from_status,
          to_status,
          event_type,
          notes,
          metadata
        ) VALUES ($1, $2, $3, $4, $4, 'PAYMENT_RECEIVED', $5, $6);
        `,
        [
          tenantId,
          workOrderId,
          actorUserId || null,
          wo.status,
          `Pagamento de R$ ${(input.amountCents / 100).toFixed(2)} recebido via ${input.method.toUpperCase()}. Saldo restante: R$ ${((remainingCents - input.amountCents) / 100).toFixed(2)}.`,
          JSON.stringify({
            paymentId: createdPayment.id,
            amountCents: input.amountCents,
            method: input.method,
            newPaidCents,
            remainingCents: remainingCents - input.amountCents,
          }),
        ]
      );
    });

    if (actorUserId) {
      await auditService.record({
        tenantId,
        userId: actorUserId,
        action: 'PAYMENT_PROCESSED',
        entity: 'payments',
        entityId: createdPayment!.id,
        newValues: createdPayment! as unknown as Record<string, unknown>,
      });
    }

    return createdPayment!;
  }

  // ============================================================================
  // 2. ESTORNO / REEMBOLSO DE PAGAMENTO
  // ============================================================================

  /**
   * Realiza estorno total ou parcial de um pagamento registrado
   * Abate de paid_cents na OS e grava trilha de auditoria especializada
   */
  async refundPayment(
    tenantId: string,
    paymentId: string,
    input: RefundPaymentInputDto,
    actorUserId?: string
  ): Promise<PaymentDto> {
    if (!input.reason || input.reason.trim().length < 3) {
      throw new PaymentValidationError('O motivo do estorno é obrigatório (mínimo 3 caracteres).');
    }

    let updatedPayment: PaymentDto;
    let previousStatus = 'approved';

    await tenantTransaction(tenantId, async (client) => {
      // 1. Lock no pagamento
      const payRes = await client.query<{
        id: string;
        work_order_id: string;
        amount_cents: number;
        refunded_amount_cents: number;
        status: string;
      }>(
        `
        SELECT id, work_order_id, amount_cents, refunded_amount_cents, status 
        FROM payments 
        WHERE tenant_id = $1 AND id = $2 
        FOR UPDATE;
        `,
        [tenantId, paymentId]
      );

      if (payRes.rows.length === 0) {
        throw new PaymentNotFoundError('Pagamento não encontrado.');
      }

      const p = payRes.rows[0];
      previousStatus = p.status;

      if (p.status === 'refunded') {
        throw new PaymentValidationError('Este pagamento já foi integralmente estornado.', 400);
      }

      const currentRefunded = p.refunded_amount_cents || 0;
      const maxRefundable = p.amount_cents - currentRefunded;
      const refundAmount = input.refundAmountCents !== undefined ? input.refundAmountCents : maxRefundable;

      if (refundAmount <= 0) {
        throw new PaymentValidationError('O valor de estorno deve ser maior que zero.');
      }
      if (refundAmount > maxRefundable) {
        throw new PaymentValidationError(
          `Valor solicitado de estorno (R$ ${(refundAmount / 100).toFixed(2)}) é maior que o valor restante reembolsável deste pagamento (R$ ${(maxRefundable / 100).toFixed(2)}).`
        );
      }

      const newRefundedTotal = currentRefunded + refundAmount;
      const newStatus = newRefundedTotal >= p.amount_cents ? 'refunded' : 'partially_refunded';

      // 2. Lock na OS para atualizar o saldo pago
      const woRes = await client.query<{ id: string; status: string; paid_cents: number }>(
        `SELECT id, status, paid_cents FROM work_orders WHERE tenant_id = $1 AND id = $2 FOR UPDATE;`,
        [tenantId, p.work_order_id]
      );
      const wo = woRes.rows[0];

      // 3. Atualizar o registro de pagamento
      const updPayRes = await client.query<PaymentDto>(
        `
        UPDATE payments
        SET 
          refunded_amount_cents = $3,
          status = $4,
          refund_reason = $5,
          refunded_at = NOW(),
          refunded_by = $6,
          updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2
        RETURNING 
          id,
          tenant_id AS "tenantId",
          work_order_id AS "workOrderId",
          amount_cents AS "amountCents",
          method,
          status,
          installments,
          card_brand AS "cardBrand",
          transaction_reference AS "transactionReference",
          notes,
          refunded_amount_cents AS "refundedAmountCents",
          refund_reason AS "refundReason",
          refunded_at AS "refundedAt",
          refunded_by AS "refundedBy",
          received_by AS "receivedBy",
          created_at AS "createdAt",
          updated_at AS "updatedAt";
        `,
        [tenantId, paymentId, newRefundedTotal, newStatus, input.reason.trim(), actorUserId || null]
      );
      updatedPayment = updPayRes.rows[0];

      // 4. Abater paid_cents na OS
      const updatedWoPaid = Math.max(0, (wo.paid_cents || 0) - refundAmount);
      await client.query(
        `UPDATE work_orders SET paid_cents = $3, updated_at = NOW() WHERE tenant_id = $1 AND id = $2;`,
        [tenantId, p.work_order_id, updatedWoPaid]
      );

      // 5. Inserir evento na linha do tempo
      await client.query(
        `
        INSERT INTO work_order_events (
          tenant_id,
          work_order_id,
          user_id,
          from_status,
          to_status,
          event_type,
          notes,
          metadata
        ) VALUES ($1, $2, $3, $4, $4, 'PAYMENT_REFUNDED', $5, $6);
        `,
        [
          tenantId,
          p.work_order_id,
          actorUserId || null,
          wo.status,
          `Estorno financeiro de R$ ${(refundAmount / 100).toFixed(2)} realizado. Motivo: ${input.reason.trim()}`,
          JSON.stringify({
            paymentId,
            refundAmountCents: refundAmount,
            newPaidCents: updatedWoPaid,
          }),
        ]
      );
    });

    if (actorUserId) {
      await auditService.recordPaymentRefund({
        tenantId,
        userId: actorUserId,
        paymentId,
        workOrderId: updatedPayment!.workOrderId,
        amount: input.refundAmountCents || updatedPayment!.amountCents,
        refundReason: input.reason.trim(),
        previousStatus,
      });
    }

    return updatedPayment!;
  }

  // ============================================================================
  // 3. ADIANTAMENTOS / SINAL (DEPOSITS)
  // ============================================================================

  /**
   * Cria um adiantamento / sinal para um cliente (opcionalmente atrelado a uma OS)
   */
  async createDeposit(
    tenantId: string,
    input: CreateDepositInputDto,
    actorUserId?: string
  ): Promise<DepositDto> {
    if (!input.amountCents || input.amountCents <= 0) {
      throw new PaymentValidationError('O valor do adiantamento/sinal deve ser maior que zero.');
    }

    // Validar cliente
    const custRes = await tenantQuery(
      tenantId,
      'SELECT id FROM customers WHERE tenant_id = $1 AND id = $2;',
      [tenantId, input.customerId]
    );
    if (custRes.rows.length === 0) {
      throw new PaymentValidationError('Cliente não encontrado nesta oficina.', 404);
    }

    const res = await tenantQuery<DepositDto>(
      tenantId,
      `
      INSERT INTO deposits (
        tenant_id,
        customer_id,
        work_order_id,
        amount_cents,
        method,
        status,
        notes,
        received_by
      ) VALUES ($1, $2, $3, $4, $5, 'held', $6, $7)
      RETURNING 
        id,
        tenant_id AS "tenantId",
        customer_id AS "customerId",
        work_order_id AS "workOrderId",
        amount_cents AS "amountCents",
        method,
        status,
        applied_to_work_order_id AS "appliedToWorkOrderId",
        applied_at AS "appliedAt",
        notes,
        received_by AS "receivedBy",
        created_at AS "createdAt",
        updated_at AS "updatedAt";
      `,
      [
        tenantId,
        input.customerId,
        input.workOrderId || null,
        input.amountCents,
        input.method,
        input.notes || null,
        actorUserId || null,
      ]
    );

    const deposit = res.rows[0];

    if (actorUserId) {
      await auditService.record({
        tenantId,
        userId: actorUserId,
        action: 'DEPOSIT_RECEIVED',
        entity: 'deposits',
        entityId: deposit.id,
        newValues: deposit as unknown as Record<string, unknown>,
      });
    }

    return deposit;
  }

  /**
   * Aplica um sinal/adiantamento retido ('held') para abater o saldo de uma Ordem de Serviço
   */
  async applyDepositToWorkOrder(
    tenantId: string,
    depositId: string,
    input: ApplyDepositInputDto,
    actorUserId?: string
  ): Promise<{ deposit: DepositDto; workOrder: any }> {
    let appliedDeposit: DepositDto;
    let updatedWorkOrder: any;

    await tenantTransaction(tenantId, async (client) => {
      // 1. Lock no depósito
      const depRes = await client.query<{
        id: string;
        customer_id: string;
        amount_cents: number;
        status: string;
        method: string;
      }>(
        `SELECT id, customer_id, amount_cents, status, method FROM deposits WHERE tenant_id = $1 AND id = $2 FOR UPDATE;`,
        [tenantId, depositId]
      );

      if (depRes.rows.length === 0) {
        throw new PaymentNotFoundError('Depósito / Sinal não encontrado.');
      }

      const dep = depRes.rows[0];

      if (dep.status !== 'held') {
        throw new PaymentValidationError(`Este sinal já possui status "${dep.status}" e não pode ser aplicado novamente.`, 400);
      }

      // 2. Lock na OS
      const woRes = await client.query<{
        id: string;
        customer_id: string;
        final_cents: number;
        paid_cents: number;
        status: string;
        os_number: number;
      }>(
        `SELECT id, customer_id, final_cents, paid_cents, status, os_number FROM work_orders WHERE tenant_id = $1 AND id = $2 FOR UPDATE;`,
        [tenantId, input.workOrderId]
      );

      if (woRes.rows.length === 0) {
        throw new PaymentNotFoundError('Ordem de serviço não encontrada.');
      }

      const wo = woRes.rows[0];

      if (wo.status === 'CANCELED') {
        throw new PaymentValidationError('Não é permitido aplicar sinal em uma Ordem de Serviço cancelada.', 422);
      }

      const remainingCents = Math.max(0, (wo.final_cents || 0) - (wo.paid_cents || 0));

      if (dep.amount_cents > remainingCents) {
        throw new PaymentExcessiveAmountError(
          `Valor do sinal (R$ ${(dep.amount_cents / 100).toFixed(2)}) é maior que o saldo restante da OS (R$ ${(remainingCents / 100).toFixed(2)}).`
        );
      }

      // 3. Atualizar status do depósito
      const updDepRes = await client.query<DepositDto>(
        `
        UPDATE deposits
        SET 
          status = 'applied',
          applied_to_work_order_id = $3,
          applied_at = NOW(),
          updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2
        RETURNING 
          id,
          tenant_id AS "tenantId",
          customer_id AS "customerId",
          work_order_id AS "workOrderId",
          amount_cents AS "amountCents",
          method,
          status,
          applied_to_work_order_id AS "appliedToWorkOrderId",
          applied_at AS "appliedAt",
          notes,
          received_by AS "receivedBy",
          created_at AS "createdAt",
          updated_at AS "updatedAt";
        `,
        [tenantId, depositId, input.workOrderId]
      );
      appliedDeposit = updDepRes.rows[0];

      // 4. Abater na OS aumentando o paid_cents
      const newPaidCents = (wo.paid_cents || 0) + dep.amount_cents;
      const updWoRes = await client.query(
        `UPDATE work_orders SET paid_cents = $3, updated_at = NOW() WHERE tenant_id = $1 AND id = $2 RETURNING *;`,
        [tenantId, input.workOrderId, newPaidCents]
      );
      updatedWorkOrder = updWoRes.rows[0];

      // 5. Inserir também um registro em payments para rastreabilidade contábil unificada
      await client.query(
        `
        INSERT INTO payments (
          tenant_id,
          work_order_id,
          amount_cents,
          method,
          status,
          notes,
          received_by
        ) VALUES ($1, $2, $3, $4, 'approved', $5, $6);
        `,
        [
          tenantId,
          input.workOrderId,
          dep.amount_cents,
          dep.method,
          `Adiantamento / Sinal #${dep.id} aplicado à OS #${wo.os_number}`,
          actorUserId || null,
        ]
      );

      // 6. Evento na linha do tempo da OS
      await client.query(
        `
        INSERT INTO work_order_events (
          tenant_id,
          work_order_id,
          user_id,
          from_status,
          to_status,
          event_type,
          notes,
          metadata
        ) VALUES ($1, $2, $3, $4, $4, 'DEPOSIT_APPLIED', $5, $6);
        `,
        [
          tenantId,
          input.workOrderId,
          actorUserId || null,
          wo.status,
          `Sinal/Adiantamento de R$ ${(dep.amount_cents / 100).toFixed(2)} aplicado à Ordem de Serviço.`,
          JSON.stringify({ depositId, amountCents: dep.amount_cents, newPaidCents }),
        ]
      );
    });

    if (actorUserId) {
      await auditService.record({
        tenantId,
        userId: actorUserId,
        action: 'DEPOSIT_APPLIED',
        entity: 'deposits',
        entityId: depositId,
        newValues: { depositId, workOrderId: input.workOrderId },
      });
    }

    return { deposit: appliedDeposit!, workOrder: updatedWorkOrder };
  }

  // ============================================================================
  // 4. RESUMO FINANCEIRO DA ORDEM DE SERVIÇO
  // ============================================================================

  /**
   * Retorna o balanço financeiro completo da OS (Total, Desconto, Final, Pago, Saldo Restante e Lista de Pagamentos)
   */
  async getWorkOrderFinancialSummary(
    tenantId: string,
    workOrderId: string
  ): Promise<WorkOrderFinancialSummaryDto> {
    const woRes = await tenantQuery<{
      id: string;
      os_number: number;
      total_cents: number;
      discount_cents: number;
      final_cents: number;
      paid_cents: number;
    }>(
      tenantId,
      `SELECT id, os_number, total_cents, discount_cents, final_cents, paid_cents 
       FROM work_orders 
       WHERE tenant_id = $1 AND id = $2;`,
      [tenantId, workOrderId]
    );

    if (woRes.rows.length === 0) {
      throw new PaymentNotFoundError('Ordem de serviço não encontrada.');
    }

    const wo = woRes.rows[0];
    const totalCents = wo.total_cents || 0;
    const discountCents = wo.discount_cents || 0;
    const finalCents = wo.final_cents || 0;
    const paidCents = wo.paid_cents || 0;
    const remainingCents = Math.max(0, finalCents - paidCents);
    const isFullyPaid = finalCents > 0 && paidCents >= finalCents;

    // Buscar pagamentos vinculados
    const payRes = await tenantQuery<PaymentDto>(
      tenantId,
      `
      SELECT 
        id,
        tenant_id AS "tenantId",
        work_order_id AS "workOrderId",
        amount_cents AS "amountCents",
        method,
        status,
        installments,
        card_brand AS "cardBrand",
        transaction_reference AS "transactionReference",
        notes,
        refunded_amount_cents AS "refundedAmountCents",
        refund_reason AS "refundReason",
        refunded_at AS "refundedAt",
        refunded_by AS "refundedBy",
        received_by AS "receivedBy",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM payments
      WHERE tenant_id = $1 AND work_order_id = $2
      ORDER BY created_at ASC;
      `,
      [tenantId, workOrderId]
    );

    // Buscar depósitos aplicados a esta OS
    const depRes = await tenantQuery<DepositDto>(
      tenantId,
      `
      SELECT 
        id,
        tenant_id AS "tenantId",
        customer_id AS "customerId",
        work_order_id AS "workOrderId",
        amount_cents AS "amountCents",
        method,
        status,
        applied_to_work_order_id AS "appliedToWorkOrderId",
        applied_at AS "appliedAt",
        notes,
        received_by AS "receivedBy",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM deposits
      WHERE tenant_id = $1 AND (work_order_id = $2 OR applied_to_work_order_id = $2)
      ORDER BY created_at ASC;
      `,
      [tenantId, workOrderId]
    );

    return {
      workOrderId: wo.id,
      osNumber: wo.os_number,
      totalCents,
      discountCents,
      finalCents,
      paidCents,
      remainingCents,
      isFullyPaid,
      payments: payRes.rows,
      deposits: depRes.rows,
    };
  }
}

export const paymentService = new PaymentService();
