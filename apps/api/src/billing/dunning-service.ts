import { pool, query } from '../database/db.js';
import { tenantQuery, tenantTransaction } from '../database/tenant-query.js';
import { auditService } from '../audit/audit-service.js';

export type DunningStage = 'none' | 'warning_3d' | 'soft_restriction_7d' | 'suspension_15d' | 'cancellation_30d' | 'regularized';

export interface DunningEventRow {
  id: string;
  tenant_id: string;
  invoice_id: string | null;
  contract_id: string | null;
  stage: string;
  days_overdue: number;
  action_taken: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface DunningRoutineResult {
  processedAt: string;
  referenceDate: string;
  invoicesEvaluated: number;
  actionsApplied: {
    warnings: number;
    softRestrictions: number;
    suspensions: number;
    cancellations: number;
  };
  details: Array<{
    tenantId: string;
    tenantSlug: string;
    invoiceId: string;
    daysOverdue: number;
    previousStage: string | null;
    newStage: DunningStage;
    actionTaken: string;
  }>;
}

export interface PayInvoiceInput {
  paymentMethod?: 'pix' | 'credit_card' | 'boleto';
  notes?: string;
  externalPaymentId?: string;
}

export interface CreateInvoiceInput {
  tenantId: string;
  amountCents: number;
  dueDate: string; // YYYY-MM-DD
  paymentMethod?: 'pix' | 'credit_card' | 'boleto';
  subscriptionId?: string;
}

export class DunningService {
  /**
   * Executa a rotina da Régua de Cobrança (Dunning Routine)
   * Suporta injeção de data de referência para testes automatizados e simulação
   */
  async runDunningRoutine(targetDate?: Date): Promise<DunningRoutineResult> {
    const referenceDate = targetDate || new Date();
    const referenceIso = referenceDate.toISOString();

    const result: DunningRoutineResult = {
      processedAt: new Date().toISOString(),
      referenceDate: referenceIso,
      invoicesEvaluated: 0,
      actionsApplied: {
        warnings: 0,
        softRestrictions: 0,
        suspensions: 0,
        cancellations: 0,
      },
      details: [],
    };

    // Buscar todas as faturas pendentes vencidas em relação à referenceDate
    const overdueInvoicesRes = await tenantQuery<{
      id: string;
      tenant_id: string;
      subscription_id: string | null;
      amount_cents: number;
      due_date: string;
      tenant_name: string;
      tenant_slug: string;
      tenant_status: string;
      is_read_only: boolean;
      last_dunning_stage: string | null;
    }>(
      null,
      `SELECT 
         i.id,
         i.tenant_id,
         i.subscription_id,
         i.amount_cents,
         i.due_date,
         t.trade_name AS tenant_name,
         t.slug AS tenant_slug,
         t.status AS tenant_status,
         t.is_read_only,
         t.last_dunning_stage
       FROM invoices i
       JOIN tenants t ON t.id = i.tenant_id
       WHERE i.status = 'pending'
         AND i.due_date < $1::date
       ORDER BY i.due_date ASC`,
      [referenceIso.slice(0, 10)],
      { bypassRls: true }
    );

    result.invoicesEvaluated = overdueInvoicesRes.rows.length;

    // Processar cada oficina com a sua fatura vencida mais crítica
    const processedTenants = new Set<string>();

    for (const inv of overdueInvoicesRes.rows) {
      if (processedTenants.has(inv.tenant_id)) {
        continue;
      }
      processedTenants.add(inv.tenant_id);

      const dueDate = new Date(inv.due_date);
      // Diferença em dias inteiros
      const diffTime = referenceDate.getTime() - dueDate.getTime();
      const daysOverdue = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

      let targetStage: DunningStage = 'none';
      let actionTaken = 'NONE';

      if (daysOverdue >= 30) {
        targetStage = 'cancellation_30d';
        actionTaken = 'TENANT_CANCELLED_OVERDUE_30D';
      } else if (daysOverdue >= 15) {
        targetStage = 'suspension_15d';
        actionTaken = 'TENANT_SUSPENDED_READ_ONLY_15D';
      } else if (daysOverdue >= 7) {
        targetStage = 'soft_restriction_7d';
        actionTaken = 'SOFT_RESTRICTION_APPLIED_7D';
      } else if (daysOverdue >= 3) {
        targetStage = 'warning_3d';
        actionTaken = 'WARNING_DISPATCHED_3D';
      }

      if (targetStage === 'none') {
        continue;
      }

      // 1. Ação para 30+ dias: Cancelamento definitivo com retenção de dados
      if (targetStage === 'cancellation_30d') {
        if (inv.tenant_status !== 'cancelled') {
          await tenantTransaction(null, async (client) => {
            // Atualizar tenant
            await client.query(
              `UPDATE tenants 
               SET status = 'cancelled', 
                   is_read_only = true, 
                   suspended_reason = 'Inadimplência financeira grave (30+ dias de atraso)',
                   last_dunning_stage = $1,
                   dunning_updated_at = NOW(),
                   updated_at = NOW()
               WHERE id = $2`,
              [targetStage, inv.tenant_id]
            );

            // Cancelar contratos ativos
            await client.query(
              `UPDATE contracts 
               SET status = 'cancelled', updated_at = NOW() 
               WHERE tenant_id = $1 AND status != 'cancelled'`,
              [inv.tenant_id]
            );

            // Registrar evento da régua
            await client.query(
              `INSERT INTO billing_dunning_events 
               (tenant_id, invoice_id, stage, days_overdue, action_taken, details)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                inv.tenant_id,
                inv.id,
                targetStage,
                daysOverdue,
                actionTaken,
                JSON.stringify({
                  amountCents: inv.amount_cents,
                  dueDate: inv.due_date,
                  daysOverdue,
                  reason: 'Atraso superior a 30 dias na fatura mensal do SaaS',
                }),
              ]
            );
          }, { bypassRls: true });

          await auditService.record({
            tenantId: inv.tenant_id,
            action: 'TENANT_DUNNING_CANCELLED',
            entity: 'tenants',
            entityId: inv.tenant_id,
            newValues: { status: 'cancelled', is_read_only: true, daysOverdue, invoiceId: inv.id },
          });

          result.actionsApplied.cancellations++;
          result.details.push({
            tenantId: inv.tenant_id,
            tenantSlug: inv.tenant_slug,
            invoiceId: inv.id,
            daysOverdue,
            previousStage: inv.last_dunning_stage,
            newStage: targetStage,
            actionTaken,
          });
        }
      }

      // 2. Ação para 15 a 29 dias: Suspensão em Modo Somente Leitura (Seção 11.2)
      else if (targetStage === 'suspension_15d') {
        if (inv.tenant_status !== 'suspended' || !inv.is_read_only) {
          await tenantTransaction(null, async (client) => {
            await client.query(
              `UPDATE tenants 
               SET status = 'suspended', 
                   is_read_only = true, 
                   suspended_reason = 'Inadimplência financeira (15+ dias de atraso)',
                   last_dunning_stage = $1,
                   dunning_updated_at = NOW(),
                   updated_at = NOW()
               WHERE id = $2`,
              [targetStage, inv.tenant_id]
            );

            // Marcar contrato como past_due
            await client.query(
              `UPDATE contracts 
               SET status = 'past_due', updated_at = NOW() 
               WHERE tenant_id = $1 AND status = 'active'`,
              [inv.tenant_id]
            );

            await client.query(
              `INSERT INTO billing_dunning_events 
               (tenant_id, invoice_id, stage, days_overdue, action_taken, details)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                inv.tenant_id,
                inv.id,
                targetStage,
                daysOverdue,
                actionTaken,
                JSON.stringify({
                  amountCents: inv.amount_cents,
                  dueDate: inv.due_date,
                  daysOverdue,
                  isReadOnly: true,
                  reason: 'Suspensão temporária por 15+ dias de atraso. Leitura liberada, escrita bloqueada.',
                }),
              ]
            );
          }, { bypassRls: true });

          await auditService.record({
            tenantId: inv.tenant_id,
            action: 'TENANT_DUNNING_SUSPENDED_READ_ONLY',
            entity: 'tenants',
            entityId: inv.tenant_id,
            newValues: { status: 'suspended', is_read_only: true, daysOverdue, invoiceId: inv.id },
          });

          result.actionsApplied.suspensions++;
          result.details.push({
            tenantId: inv.tenant_id,
            tenantSlug: inv.tenant_slug,
            invoiceId: inv.id,
            daysOverdue,
            previousStage: inv.last_dunning_stage,
            newStage: targetStage,
            actionTaken,
          });
        }
      }

      // 3. Ação para 7 a 14 dias: Restrição leve (alerta no dashboard, bloqueia novas filiais)
      else if (targetStage === 'soft_restriction_7d') {
        if (inv.last_dunning_stage !== 'soft_restriction_7d' && inv.tenant_status === 'active') {
          await tenantTransaction(null, async (client) => {
            await client.query(
              `UPDATE tenants 
               SET last_dunning_stage = $1,
                   dunning_updated_at = NOW(),
                   updated_at = NOW()
               WHERE id = $2`,
              [targetStage, inv.tenant_id]
            );

            await client.query(
              `INSERT INTO billing_dunning_events 
               (tenant_id, invoice_id, stage, days_overdue, action_taken, details)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                inv.tenant_id,
                inv.id,
                targetStage,
                daysOverdue,
                actionTaken,
                JSON.stringify({
                  amountCents: inv.amount_cents,
                  dueDate: inv.due_date,
                  daysOverdue,
                  restriction: 'soft_restriction',
                }),
              ]
            );
          }, { bypassRls: true });

          result.actionsApplied.softRestrictions++;
          result.details.push({
            tenantId: inv.tenant_id,
            tenantSlug: inv.tenant_slug,
            invoiceId: inv.id,
            daysOverdue,
            previousStage: inv.last_dunning_stage,
            newStage: targetStage,
            actionTaken,
          });
        }
      }

      // 4. Ação para 3 a 6 dias: Aviso de cobrança enviado
      else if (targetStage === 'warning_3d') {
        if (!inv.last_dunning_stage && inv.tenant_status === 'active') {
          await tenantTransaction(null, async (client) => {
            await client.query(
              `UPDATE tenants 
               SET last_dunning_stage = $1,
                   dunning_updated_at = NOW(),
                   updated_at = NOW()
               WHERE id = $2`,
              [targetStage, inv.tenant_id]
            );

            await client.query(
              `INSERT INTO billing_dunning_events 
               (tenant_id, invoice_id, stage, days_overdue, action_taken, details)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                inv.tenant_id,
                inv.id,
                targetStage,
                daysOverdue,
                actionTaken,
                JSON.stringify({
                  amountCents: inv.amount_cents,
                  dueDate: inv.due_date,
                  daysOverdue,
                }),
              ]
            );
          }, { bypassRls: true });

          result.actionsApplied.warnings++;
          result.details.push({
            tenantId: inv.tenant_id,
            tenantSlug: inv.tenant_slug,
            invoiceId: inv.id,
            daysOverdue,
            previousStage: inv.last_dunning_stage,
            newStage: targetStage,
            actionTaken,
          });
        }
      }
    }

    return result;
  }

  /**
   * Baixa manual de fatura realizada pelo Super Admin
   * Se o tenant não tiver mais faturas em atraso >= 15 dias, reativa imediatamente a oficina!
   */
  async payInvoiceManual(
    invoiceId: string,
    input: PayInvoiceInput,
    superadminId: string
  ): Promise<{
    invoice: { id: string; status: string; paid_at: string };
    tenantReactivated: boolean;
    tenant: { id: string; status: string; is_read_only: boolean };
  }> {
    // 1. Obter a fatura
    const invRes = await tenantQuery<{
      id: string;
      tenant_id: string;
      amount_cents: number;
      status: string;
      due_date: string;
    }>(
      null,
      'SELECT id, tenant_id, amount_cents, status, due_date FROM invoices WHERE id = $1 LIMIT 1',
      [invoiceId],
      { bypassRls: true }
    );

    if (invRes.rows.length === 0) {
      const err = new Error(`Fatura "${invoiceId}" não encontrada.`);
      (err as unknown as { statusCode: number }).statusCode = 404;
      throw err;
    }

    const inv = invRes.rows[0];

    if (inv.status === 'paid') {
      const err = new Error(`Fatura "${invoiceId}" já consta como paga.`);
      (err as unknown as { statusCode: number }).statusCode = 400;
      throw err;
    }

    const paymentMethod = input.paymentMethod || 'pix';

    let tenantReactivated = false;
    let updatedTenantRow: { id: string; status: string; is_read_only: boolean } = {
      id: inv.tenant_id,
      status: 'active',
      is_read_only: false,
    };

    await tenantTransaction(null, async (client) => {
      // 2. Dar baixa na fatura
      await client.query(
        `UPDATE invoices 
         SET status = 'paid', 
             paid_at = NOW(), 
             payment_method = $1, 
             external_payment_id = $2,
             updated_at = NOW() 
         WHERE id = $3`,
        [paymentMethod, input.externalPaymentId || `manual_pay_${Date.now()}`, invoiceId]
      );

      // 3. Verificar se ainda restam outras faturas pendentes vencidas há mais de 15 dias
      const remainingOverdueRes = await client.query<{ count: string }>(
        `SELECT COUNT(*) AS count
         FROM invoices
         WHERE tenant_id = $1
           AND status = 'pending'
           AND id != $2
           AND due_date < (NOW() - INTERVAL '15 days')`,
        [inv.tenant_id, invoiceId]
      );

      const hasCriticalOverdue = parseInt(remainingOverdueRes.rows[0].count, 10) > 0;

      // 4. Se não há mais faturas críticas, reativa a oficina e restaura modo de escrita
      if (!hasCriticalOverdue) {
        const updateTenantRes = await client.query<{ id: string; status: string; is_read_only: boolean }>(
          `UPDATE tenants 
           SET status = 'active', 
               is_read_only = false, 
               suspended_reason = NULL,
               last_dunning_stage = 'regularized',
               dunning_updated_at = NOW(),
               updated_at = NOW() 
           WHERE id = $1
           RETURNING id, status, is_read_only`,
          [inv.tenant_id]
        );

        if (updateTenantRes.rows.length > 0) {
          updatedTenantRow = updateTenantRes.rows[0];
          tenantReactivated = true;
        }

        // Reativar contrato
        await client.query(
          `UPDATE contracts 
           SET status = 'active', updated_at = NOW() 
           WHERE tenant_id = $1 AND status IN ('past_due', 'suspended')`,
          [inv.tenant_id]
        );

        // Registrar evento de dunning de regularização
        await client.query(
          `INSERT INTO billing_dunning_events 
           (tenant_id, invoice_id, stage, days_overdue, action_taken, details)
           VALUES ($1, $2, 'regularized', 0, 'TENANT_REACTIVATED_PAYMENT', $3)`,
          [
            inv.tenant_id,
            invoiceId,
            JSON.stringify({
              superadminId,
              notes: input.notes || 'Baixa manual com reativação imediata da oficina',
              paymentMethod,
            }),
          ]
        );
      } else {
        const currentTenantRes = await client.query<{ id: string; status: string; is_read_only: boolean }>(
          'SELECT id, status, is_read_only FROM tenants WHERE id = $1',
          [inv.tenant_id]
        );
        if (currentTenantRes.rows.length > 0) {
          updatedTenantRow = currentTenantRes.rows[0];
        }
      }
    }, { bypassRls: true });

    // 5. Auditoria imutável
    await auditService.record({
      tenantId: inv.tenant_id,
      superadminUserId: superadminId,
      action: 'INVOICE_PAID_MANUAL',
      entity: 'invoices',
      entityId: invoiceId,
      oldValues: { status: inv.status },
      newValues: { status: 'paid', paymentMethod, tenantReactivated },
    });

    if (tenantReactivated) {
      await auditService.record({
        tenantId: inv.tenant_id,
        superadminUserId: superadminId,
        action: 'TENANT_REACTIVATED',
        entity: 'tenants',
        entityId: inv.tenant_id,
        newValues: { status: 'active', is_read_only: false, reason: 'Regularização financeira de faturas' },
      });
    }

    return {
      invoice: {
        id: invoiceId,
        status: 'paid',
        paid_at: new Date().toISOString(),
      },
      tenantReactivated,
      tenant: updatedTenantRow,
    };
  }

  /**
   * Cancelamento manual de fatura pelo Super Admin
   */
  async cancelInvoiceManual(
    invoiceId: string,
    reason: string,
    superadminId: string
  ): Promise<{ id: string; status: string }> {
    const invRes = await tenantQuery<{ id: string; tenant_id: string; status: string }>(
      null,
      'SELECT id, tenant_id, status FROM invoices WHERE id = $1 LIMIT 1',
      [invoiceId],
      { bypassRls: true }
    );

    if (invRes.rows.length === 0) {
      const err = new Error(`Fatura "${invoiceId}" não encontrada.`);
      (err as unknown as { statusCode: number }).statusCode = 404;
      throw err;
    }

    const inv = invRes.rows[0];

    if (inv.status === 'paid') {
      const err = new Error('Não é permitido cancelar uma fatura já paga. Utilize estorno/refund.');
      (err as unknown as { statusCode: number }).statusCode = 400;
      throw err;
    }

    await tenantQuery(
      null,
      `UPDATE invoices 
       SET status = 'cancelled', updated_at = NOW() 
       WHERE id = $1`,
      [invoiceId],
      { bypassRls: true }
    );

    await auditService.record({
      tenantId: inv.tenant_id,
      superadminUserId: superadminId,
      action: 'INVOICE_CANCELLED_MANUAL',
      entity: 'invoices',
      entityId: invoiceId,
      oldValues: { status: inv.status },
      newValues: { status: 'cancelled', reason },
    });

    return {
      id: invoiceId,
      status: 'cancelled',
    };
  }

  /**
   * Emissão manual de nova fatura para oficina pelo Super Admin
   */
  async createInvoiceManual(
    input: CreateInvoiceInput,
    superadminId: string
  ): Promise<{
    id: string;
    tenant_id: string;
    amount_cents: number;
    due_date: string;
    status: string;
  }> {
    const paymentMethod = input.paymentMethod || 'pix';

    const insertRes = await tenantQuery<{
      id: string;
      tenant_id: string;
      amount_cents: number;
      due_date: string;
      status: string;
    }>(
      null,
      `INSERT INTO invoices (
         tenant_id,
         subscription_id,
         amount_cents,
         due_date,
         status,
         payment_method
       ) VALUES ($1, $2, $3, $4::date, 'pending', $5)
       RETURNING id, tenant_id, amount_cents, due_date::text, status`,
      [input.tenantId, input.subscriptionId || null, input.amountCents, input.dueDate, paymentMethod],
      { bypassRls: true }
    );

    const newInvoice = insertRes.rows[0];

    await auditService.record({
      tenantId: input.tenantId,
      superadminUserId: superadminId,
      action: 'INVOICE_CREATED_MANUAL',
      entity: 'invoices',
      entityId: newInvoice.id,
      newValues: newInvoice,
    });

    return newInvoice;
  }

  /**
   * Consulta histórico imutável de eventos da régua de cobrança
   */
  async getDunningEvents(options: {
    tenantId?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ events: DunningEventRow[]; total: number }> {
    const limit = options.limit || 20;
    const offset = options.offset || 0;
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (options.tenantId) {
      params.push(options.tenantId);
      conditions.push(`e.tenant_id = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await tenantQuery<{ count: string }>(
      null,
      `SELECT COUNT(*) AS count FROM billing_dunning_events e ${whereClause}`,
      params,
      { bypassRls: true }
    );

    const total = parseInt(countRes.rows[0].count, 10);

    params.push(limit);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const eventsRes = await tenantQuery<DunningEventRow>(
      null,
      `SELECT 
         e.id,
         e.tenant_id,
         e.invoice_id,
         e.contract_id,
         e.stage,
         e.days_overdue,
         e.action_taken,
         e.details,
         e.created_at
       FROM billing_dunning_events e
       ${whereClause}
       ORDER BY e.created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params,
      { bypassRls: true }
    );

    return {
      events: eventsRes.rows,
      total,
    };
  }
}

export const dunningService = new DunningService();
