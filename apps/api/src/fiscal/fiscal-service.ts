import { tenantQuery, tenantTransaction } from '../database/tenant-query.js';
import { planService } from '../plans/plan-service.js';
import {
  PlanFeatures,
  type TenantFiscalSettingsDto,
  type UpdateFiscalSettingsInputDto,
  type FiscalInvoiceDto,
  type IssueWorkOrderNfseInputDto,
  type CancelNfseInputDto,
} from '@carx/shared';
import { encryptFiscalSecret, decryptFiscalSecret } from './fiscal-crypto.js';
import { FocusNfeProvider, type IFiscalProvider } from './fiscal-provider.js';

export class FiscalConfigError extends Error {
  statusCode = 400;
  code = 'FISCAL_CONFIG_ERROR';
  constructor(message = 'Configurações fiscais da oficina incompletas ou ausentes.') {
    super(message);
    this.name = 'FiscalConfigError';
  }
}

export class FiscalConflictError extends Error {
  statusCode = 409;
  code = 'FISCAL_INVOICE_CONFLICT';
  constructor(message = 'Já existe uma NFS-e emitida ou em processamento para esta Ordem de Serviço.') {
    super(message);
    this.name = 'FiscalConflictError';
  }
}

export class FiscalNotFoundError extends Error {
  statusCode = 404;
  code = 'FISCAL_INVOICE_NOT_FOUND';
  constructor(message = 'Nota fiscal de serviço não encontrada.') {
    super(message);
    this.name = 'FiscalNotFoundError';
  }
}

export class FiscalValidationError extends Error {
  statusCode = 400;
  code = 'FISCAL_VALIDATION_ERROR';
  constructor(message: string) {
    super(message);
    this.name = 'FiscalValidationError';
  }
}

export class FiscalService {
  private provider: IFiscalProvider;

  constructor(provider?: IFiscalProvider) {
    this.provider = provider || new FocusNfeProvider();
  }

  /**
   * Obtém as configurações fiscais do tenant
   */
  async getFiscalSettings(tenantId: string): Promise<TenantFiscalSettingsDto> {
    const res = await tenantQuery<{
      tenant_id: string;
      environment: 'sandbox' | 'production';
      provider: 'focus_nfe' | 'plugnotas' | 'enotas';
      api_token_encrypted: string | null;
      certificate_pfx_base64_encrypted: string | null;
      certificate_expires_at: string | null;
      company_legal_name: string | null;
      company_cnpj: string | null;
      municipal_inscription: string | null;
      tax_regime: 'simples_nacional' | 'lucro_presumido' | 'lucro_real' | 'mei';
      special_tax_regime: string | null;
      default_service_code: string;
      cnae_code: string;
      default_iss_rate_basis_points: number;
      iss_retention_default: boolean;
      auto_issue_on_delivery: boolean;
      auto_issue_on_payment: boolean;
      send_email_to_customer: boolean;
      last_rps_number: number;
      rps_series: string;
      created_at: string;
      updated_at: string;
    }>(
      tenantId,
      `SELECT * FROM tenant_fiscal_settings WHERE tenant_id = $1 LIMIT 1`,
      [tenantId]
    );

    if (res.rows.length === 0) {
      // Retorna estado padrão para preenchimento
      return {
        tenantId,
        environment: 'sandbox',
        provider: 'focus_nfe',
        hasApiToken: false,
        hasCertificate: false,
        certificateExpiresAt: null,
        companyLegalName: null,
        companyCnpj: null,
        municipalInscription: null,
        taxRegime: 'simples_nacional',
        specialTaxRegime: null,
        defaultServiceCode: '14.01',
        cnaeCode: '4520-0/05',
        defaultIssRateBasisPoints: 200,
        issRetentionDefault: false,
        autoIssueOnDelivery: false,
        autoIssueOnPayment: false,
        sendEmailToCustomer: true,
        lastRpsNumber: 0,
        rpsSeries: '1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    const row = res.rows[0];
    return {
      tenantId: row.tenant_id,
      environment: row.environment,
      provider: row.provider,
      hasApiToken: Boolean(row.api_token_encrypted),
      hasCertificate: Boolean(row.certificate_pfx_base64_encrypted),
      certificateExpiresAt: row.certificate_expires_at,
      companyLegalName: row.company_legal_name,
      companyCnpj: row.company_cnpj,
      municipalInscription: row.municipal_inscription,
      taxRegime: row.tax_regime,
      specialTaxRegime: row.special_tax_regime,
      defaultServiceCode: row.default_service_code || '14.01',
      cnaeCode: row.cnae_code || '4520-0/05',
      defaultIssRateBasisPoints: row.default_iss_rate_basis_points || 200,
      issRetentionDefault: row.iss_retention_default,
      autoIssueOnDelivery: row.auto_issue_on_delivery,
      autoIssueOnPayment: row.auto_issue_on_payment,
      sendEmailToCustomer: row.send_email_to_customer,
      lastRpsNumber: row.last_rps_number || 0,
      rpsSeries: row.rps_series || '1',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Atualiza ou cadastra as configurações fiscais do tenant com criptografia
   */
  async updateFiscalSettings(
    tenantId: string,
    data: UpdateFiscalSettingsInputDto
  ): Promise<TenantFiscalSettingsDto> {
    // Buscar configurações atuais para manter tokens caso não reenviados
    const currentRes = await tenantQuery<{
      api_token_encrypted: string | null;
      certificate_pfx_base64_encrypted: string | null;
      certificate_password_encrypted: string | null;
    }>(
      tenantId,
      `SELECT api_token_encrypted, certificate_pfx_base64_encrypted, certificate_password_encrypted 
       FROM tenant_fiscal_settings WHERE tenant_id = $1`,
      [tenantId]
    );

    let apiTokenEnc = currentRes.rows[0]?.api_token_encrypted || null;
    if (data.apiToken !== undefined) {
      apiTokenEnc = data.apiToken ? encryptFiscalSecret(data.apiToken) : null;
    }

    let certPfxEnc = currentRes.rows[0]?.certificate_pfx_base64_encrypted || null;
    if (data.certificatePfxBase64 !== undefined) {
      certPfxEnc = data.certificatePfxBase64 ? encryptFiscalSecret(data.certificatePfxBase64) : null;
    }

    let certPassEnc = currentRes.rows[0]?.certificate_password_encrypted || null;
    if (data.certificatePassword !== undefined) {
      certPassEnc = data.certificatePassword ? encryptFiscalSecret(data.certificatePassword) : null;
    }

    await tenantQuery(
      tenantId,
      `INSERT INTO tenant_fiscal_settings (
        tenant_id, environment, provider, api_token_encrypted,
        certificate_pfx_base64_encrypted, certificate_password_encrypted,
        company_legal_name, company_cnpj, municipal_inscription,
        tax_regime, special_tax_regime, default_service_code, cnae_code,
        default_iss_rate_basis_points, iss_retention_default,
        auto_issue_on_delivery, auto_issue_on_payment, send_email_to_customer,
        last_rps_number, rps_series, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 
        COALESCE($19, 0), $20, NOW()
      )
      ON CONFLICT (tenant_id) DO UPDATE SET
        environment = EXCLUDED.environment,
        provider = EXCLUDED.provider,
        api_token_encrypted = COALESCE(EXCLUDED.api_token_encrypted, tenant_fiscal_settings.api_token_encrypted),
        certificate_pfx_base64_encrypted = COALESCE(EXCLUDED.certificate_pfx_base64_encrypted, tenant_fiscal_settings.certificate_pfx_base64_encrypted),
        certificate_password_encrypted = COALESCE(EXCLUDED.certificate_password_encrypted, tenant_fiscal_settings.certificate_password_encrypted),
        company_legal_name = EXCLUDED.company_legal_name,
        company_cnpj = EXCLUDED.company_cnpj,
        municipal_inscription = EXCLUDED.municipal_inscription,
        tax_regime = EXCLUDED.tax_regime,
        special_tax_regime = EXCLUDED.special_tax_regime,
        default_service_code = EXCLUDED.default_service_code,
        cnae_code = EXCLUDED.cnae_code,
        default_iss_rate_basis_points = EXCLUDED.default_iss_rate_basis_points,
        iss_retention_default = EXCLUDED.iss_retention_default,
        auto_issue_on_delivery = EXCLUDED.auto_issue_on_delivery,
        auto_issue_on_payment = EXCLUDED.auto_issue_on_payment,
        send_email_to_customer = EXCLUDED.send_email_to_customer,
        last_rps_number = CASE WHEN $19 IS NOT NULL THEN $19 ELSE tenant_fiscal_settings.last_rps_number END,
        rps_series = EXCLUDED.rps_series,
        updated_at = NOW()`,
      [
        tenantId,
        data.environment,
        data.provider,
        apiTokenEnc,
        certPfxEnc,
        certPassEnc,
        data.companyLegalName || null,
        data.companyCnpj || null,
        data.municipalInscription || null,
        data.taxRegime,
        data.specialTaxRegime || null,
        data.defaultServiceCode,
        data.cnaeCode,
        data.defaultIssRateBasisPoints,
        data.issRetentionDefault,
        data.autoIssueOnDelivery,
        data.autoIssueOnPayment,
        data.sendEmailToCustomer,
        data.lastRpsNumber !== undefined ? data.lastRpsNumber : null,
        data.rpsSeries,
      ]
    );

    return this.getFiscalSettings(tenantId);
  }

  /**
   * Obtém a NFS-e vinculada a uma Ordem de Serviço
   */
  async getInvoiceByWorkOrder(tenantId: string, workOrderId: string): Promise<FiscalInvoiceDto | null> {
    const res = await tenantQuery<{
      id: string;
      tenant_id: string;
      work_order_id: string;
      customer_id: string | null;
      environment: 'sandbox' | 'production';
      provider: 'focus_nfe' | 'plugnotas' | 'enotas';
      provider_invoice_id: string | null;
      rps_number: number;
      rps_series: string;
      invoice_number: string | null;
      verification_code: string | null;
      status: 'draft' | 'processing' | 'authorized' | 'error' | 'cancelled';
      gross_amount_cents: number;
      deductions_cents: number;
      net_amount_cents: number;
      iss_rate_basis_points: number;
      iss_amount_cents: number;
      description: string;
      service_code: string;
      cnae_code: string;
      error_message: string | null;
      xml_url: string | null;
      pdf_url: string | null;
      issued_at: string | null;
      cancelled_at: string | null;
      cancel_reason: string | null;
      created_at: string;
      updated_at: string;
    }>(
      tenantId,
      `SELECT * FROM fiscal_invoices 
       WHERE tenant_id = $1 AND work_order_id = $2 
       ORDER BY created_at DESC LIMIT 1`,
      [tenantId, workOrderId]
    );

    if (res.rows.length === 0) return null;
    return this.mapInvoiceRow(res.rows[0]);
  }

  /**
   * Lista notas fiscais da oficina
   */
  async listInvoices(
    tenantId: string,
    filters: { status?: string; limit?: number; offset?: number } = {}
  ): Promise<{ invoices: FiscalInvoiceDto[]; total: number }> {
    const limit = Math.min(filters.limit || 50, 100);
    const offset = filters.offset || 0;

    const whereClauses: string[] = ['tenant_id = $1'];
    const params: any[] = [tenantId];

    if (filters.status) {
      params.push(filters.status);
      whereClauses.push(`status = $${params.length}`);
    }

    const whereStr = whereClauses.join(' AND ');

    const countRes = await tenantQuery<{ count: string }>(
      tenantId,
      `SELECT COUNT(*)::text as count FROM fiscal_invoices WHERE ${whereStr}`,
      params
    );
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    const dataRes = await tenantQuery<any>(
      tenantId,
      `SELECT * FROM fiscal_invoices 
       WHERE ${whereStr} 
       ORDER BY created_at DESC 
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    return {
      invoices: dataRes.rows.map((r) => this.mapInvoiceRow(r)),
      total,
    };
  }

  /**
   * Emite NFS-e para uma Ordem de Serviço
   */
  async issueWorkOrderNfse(
    tenantId: string,
    workOrderId: string,
    options?: IssueWorkOrderNfseInputDto
  ): Promise<FiscalInvoiceDto> {
    // 1. Gating por plano: apenas planos Pro e Premium com feature NFSE
    await planService.assertFeature(tenantId, PlanFeatures.NFSE);

    // 2. Buscar configurações fiscais do tenant
    const settingsRes = await tenantQuery<{
      environment: 'sandbox' | 'production';
      provider: 'focus_nfe' | 'plugnotas' | 'enotas';
      api_token_encrypted: string | null;
      company_legal_name: string | null;
      company_cnpj: string | null;
      municipal_inscription: string | null;
      tax_regime: string;
      default_service_code: string;
      cnae_code: string;
      default_iss_rate_basis_points: number;
      rps_series: string;
    }>(
      tenantId,
      `SELECT * FROM tenant_fiscal_settings WHERE tenant_id = $1 LIMIT 1`,
      [tenantId]
    );

    const settings = settingsRes.rows[0];
    if (!settings || (!settings.company_cnpj && settings.environment === 'production')) {
      throw new FiscalConfigError(
        'Configure o CNPJ e os dados fiscais da oficina na aba de Configurações antes de emitir NFS-e.'
      );
    }

    // 3. Buscar Ordem de Serviço
    const woRes = await tenantQuery<{
      id: string;
      os_number: number;
      status: string;
      final_cents: number;
      paid_cents: number;
      customer_id: string;
      vehicle_id: string;
    }>(
      tenantId,
      `SELECT id, os_number, status, final_cents, paid_cents, customer_id, vehicle_id 
       FROM work_orders 
       WHERE tenant_id = $1 AND id = $2 LIMIT 1`,
      [tenantId, workOrderId]
    );

    const wo = woRes.rows[0];
    if (!wo) {
      throw new FiscalValidationError('Ordem de Serviço não encontrada.');
    }

    // 4. Verificar se já existe NFS-e emitida ou em processamento (idempotência)
    const existing = await this.getInvoiceByWorkOrder(tenantId, workOrderId);
    if (existing && (existing.status === 'authorized' || existing.status === 'processing')) {
      throw new FiscalConflictError(
        `Esta OS já possui uma NFS-e com status "${existing.status}" (Nota: ${existing.invoiceNumber || 'Em processamento'}).`
      );
    }

    // 5. Buscar dados do cliente e veículo
    const custRes = await tenantQuery<{
      id: string;
      name: string;
      document: string | null;
      email: string | null;
      phone: string | null;
    }>(
      tenantId,
      `SELECT id, name, document, email, phone FROM customers WHERE id = $1 LIMIT 1`,
      [wo.customer_id]
    );
    const customer = custRes.rows[0];

    const vehRes = await tenantQuery<{
      plate: string;
      model: string;
    }>(
      tenantId,
      `SELECT plate, model FROM vehicles WHERE id = $1 LIMIT 1`,
      [wo.vehicle_id]
    );
    const vehicle = vehRes.rows[0];

    // 6. Itens de serviço da OS para discriminação
    const itemsRes = await tenantQuery<{ name: string; unit_price_cents: number; quantity: number }>(
      tenantId,
      `SELECT name, unit_price_cents, quantity FROM work_order_items WHERE work_order_id = $1`,
      [workOrderId]
    );

    const itemsSummary = itemsRes.rows.length > 0
      ? itemsRes.rows.map((it) => `${it.name} (${it.quantity}x)`).join(', ')
      : 'Serviços automotivos especializados';

    const defaultDescription = `Serviços automotivos prestados na OS #${wo.os_number} - Veículo: ${vehicle?.model || 'Não informado'} (${vehicle?.plate || 'Placa'}). Serviços: ${itemsSummary}.`;
    const finalDescription = options?.customDescription?.trim() || defaultDescription;

    // 7. Cálculo Financeiro
    const grossAmountCents = wo.final_cents || 0;
    const deductionsCents = options?.deductionsCents || 0;
    const netAmountCents = Math.max(0, grossAmountCents - deductionsCents);
    const issRateBasisPoints = options?.issRateBasisPoints ?? (settings.default_iss_rate_basis_points || 200);
    const issAmountCents = Math.round((netAmountCents * issRateBasisPoints) / 10000);

    const serviceCode = options?.serviceCode || settings.default_service_code || '14.01';
    const cnaeCode = options?.cnaeCode || settings.cnae_code || '4520-0/05';

    // 8. Obtenção do próximo RPS de forma estritamente sequencial
    const rpsUpdateRes = await tenantQuery<{ last_rps_number: number }>(
      tenantId,
      `UPDATE tenant_fiscal_settings 
       SET last_rps_number = COALESCE(last_rps_number, 0) + 1, updated_at = NOW() 
       WHERE tenant_id = $1 
       RETURNING last_rps_number`,
      [tenantId]
    );
    const nextRpsNumber = rpsUpdateRes.rows[0]?.last_rps_number || 1;
    const rpsSeries = settings.rps_series || '1';

    // 9. Inserir registro inicial da nota
    const invoiceInsertRes = await tenantQuery<{ id: string }>(
      tenantId,
      `INSERT INTO fiscal_invoices (
        tenant_id, work_order_id, customer_id, environment, provider,
        rps_number, rps_series, status, gross_amount_cents, deductions_cents,
        net_amount_cents, iss_rate_basis_points, iss_amount_cents,
        description, service_code, cnae_code
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, 'processing', $8, $9, $10, $11, $12, $13, $14, $15
      ) RETURNING id`,
      [
        tenantId,
        workOrderId,
        wo.customer_id,
        settings.environment,
        settings.provider,
        nextRpsNumber,
        rpsSeries,
        grossAmountCents,
        deductionsCents,
        netAmountCents,
        issRateBasisPoints,
        issAmountCents,
        finalDescription,
        serviceCode,
        cnaeCode,
      ]
    );
    const invoiceId = invoiceInsertRes.rows[0].id;

    // 10. Descriptografar token se disponível
    const apiToken = settings.api_token_encrypted 
      ? decryptFiscalSecret(settings.api_token_encrypted) 
      : undefined;

    // 11. Disparar para o Provedor Fiscal
    const providerResponse = await this.provider.issueNfse(
      {
        tenantId,
        rpsNumber: nextRpsNumber,
        rpsSeries,
        environment: settings.environment,
        company: {
          cnpj: settings.company_cnpj || '00000000000191',
          legalName: settings.company_legal_name || 'CarX Auto Center',
          municipalInscription: settings.municipal_inscription || undefined,
          taxRegime: settings.tax_regime,
        },
        customer: {
          document: customer?.document || '000.000.000-00',
          name: customer?.name || 'Consumidor Final',
          email: customer?.email || undefined,
          phone: customer?.phone || undefined,
        },
        service: {
          serviceCode,
          cnaeCode,
          description: finalDescription,
          grossAmountCents,
          deductionsCents,
          netAmountCents,
          issRateBasisPoints,
          issAmountCents,
        },
      },
      apiToken
    );

    // 12. Atualizar status retornado pelo provedor
    await tenantQuery(
      tenantId,
      `UPDATE fiscal_invoices SET
        provider_invoice_id = $1::varchar,
        status = $2::varchar,
        invoice_number = $3::varchar,
        verification_code = $4::varchar,
        xml_url = $5::text,
        pdf_url = $6::text,
        error_message = $7::text,
        issued_at = CASE WHEN $2::varchar = 'authorized' THEN NOW() ELSE NULL END,
        updated_at = NOW()
       WHERE id = $8::uuid`,
      [
        providerResponse.providerInvoiceId,
        providerResponse.status,
        providerResponse.invoiceNumber || null,
        providerResponse.verificationCode || null,
        providerResponse.xmlUrl || null,
        providerResponse.pdfUrl || null,
        providerResponse.errorMessage || null,
        invoiceId,
      ]
    );

    // 13. Registrar evento na timeline da OS
    const eventDescription = providerResponse.status === 'authorized'
      ? `NFS-e autorizada com sucesso (Nota: ${providerResponse.invoiceNumber}, RPS: ${nextRpsNumber}).`
      : providerResponse.status === 'processing'
      ? `NFS-e transmitida para a prefeitura e em processamento (RPS: ${nextRpsNumber}).`
      : `Falha na transmissão da NFS-e: ${providerResponse.errorMessage || 'Erro da prefeitura'}`;

    await tenantQuery(
      tenantId,
      `INSERT INTO work_order_events (tenant_id, work_order_id, from_status, to_status, notes)
       VALUES ($1, $2, $3, $3, $4)`,
      [tenantId, workOrderId, wo.status, `[Fiscal] ${eventDescription}`]
    );

    const finalInvoice = await this.getInvoiceById(tenantId, invoiceId);
    if (!finalInvoice) throw new Error('Falha ao recuperar a NFS-e recém-criada.');
    return finalInvoice;
  }

  /**
   * Cancelamento formal de NFS-e autorizada
   */
  async cancelNfse(tenantId: string, invoiceId: string, input: CancelNfseInputDto): Promise<FiscalInvoiceDto> {
    await planService.assertFeature(tenantId, PlanFeatures.NFSE);

    const inv = await this.getInvoiceById(tenantId, invoiceId);
    if (!inv) throw new FiscalNotFoundError();

    if (inv.status !== 'authorized') {
      throw new FiscalValidationError('Apenas notas fiscais com status "authorized" podem ser canceladas.');
    }

    // Buscar configurações para token
    const settingsRes = await tenantQuery<{ api_token_encrypted: string | null }>(
      tenantId,
      `SELECT api_token_encrypted FROM tenant_fiscal_settings WHERE tenant_id = $1`,
      [tenantId]
    );
    const apiToken = settingsRes.rows[0]?.api_token_encrypted
      ? decryptFiscalSecret(settingsRes.rows[0].api_token_encrypted)
      : undefined;

    // Disparar cancelamento no provedor
    const cancelRes = await this.provider.cancelNfse(
      inv.providerInvoiceId || inv.id,
      input.reason,
      apiToken
    );

    if (!cancelRes.success) {
      throw new FiscalValidationError(cancelRes.errorMessage || 'Falha ao solicitar cancelamento da NFS-e.');
    }

    await tenantQuery(
      tenantId,
      `UPDATE fiscal_invoices SET
        status = 'cancelled',
        cancelled_at = NOW(),
        cancel_reason = $1,
        updated_at = NOW()
       WHERE id = $2 AND tenant_id = $3`,
      [input.reason, invoiceId, tenantId]
    );

    // Timeline da OS
    await tenantQuery(
      tenantId,
      `INSERT INTO work_order_events (tenant_id, work_order_id, from_status, to_status, notes)
       VALUES ($1, $2, 'CANCELLED', 'CANCELLED', $3)`,
      [tenantId, inv.workOrderId, `[Fiscal] NFS-e #${inv.invoiceNumber || inv.rpsNumber} cancelada: ${input.reason}`]
    );

    const updated = await this.getInvoiceById(tenantId, invoiceId);
    return updated!;
  }

  /**
   * Webhook para atualização de status assíncrono vindo da prefeitura ou provedor fiscal
   */
  async handleFiscalWebhook(payload: any): Promise<{ handled: boolean; invoiceId?: string; status?: string }> {
    if (!payload) return { handled: false };

    const providerInvoiceId = payload.referencia || payload.provider_invoice_id || payload.id;
    if (!providerInvoiceId) return { handled: false };

    // Buscar a nota pelo providerInvoiceId ignorando RLS inicial para encontrar o tenant
    const invRes = await tenantQuery<{ id: string; tenant_id: string; work_order_id: string }>(
      null,
      `SELECT id, tenant_id, work_order_id FROM fiscal_invoices 
       WHERE provider_invoice_id = $1 LIMIT 1`,
      [String(providerInvoiceId)],
      { bypassRls: true }
    );

    if (invRes.rows.length === 0) return { handled: false };
    const invoice = invRes.rows[0];

    const isAuthorized = payload.status === 'autorizado' || payload.status === 'authorized';
    const isError = payload.status === 'erro_autorizacao' || payload.status === 'error';

    const newStatus = isAuthorized ? 'authorized' : isError ? 'error' : 'processing';
    const invoiceNumber = payload.numero || payload.invoice_number || null;
    const verificationCode = payload.codigo_verificacao || payload.verification_code || null;
    const xmlUrl = payload.caminho_xml_nota_fiscal || payload.xml_url || null;
    const pdfUrl = payload.caminho_danfe || payload.pdf_url || null;
    const errorMessage = payload.mensagem_sefaz || payload.error_message || null;

    await tenantQuery(
      invoice.tenant_id,
      `UPDATE fiscal_invoices SET
        status = $1::varchar,
        invoice_number = COALESCE($2::varchar, invoice_number),
        verification_code = COALESCE($3::varchar, verification_code),
        xml_url = COALESCE($4::text, xml_url),
        pdf_url = COALESCE($5::text, pdf_url),
        error_message = $6::text,
        issued_at = CASE WHEN $1::varchar = 'authorized' AND issued_at IS NULL THEN NOW() ELSE issued_at END,
        updated_at = NOW()
       WHERE id = $7::uuid`,
      [newStatus, invoiceNumber, verificationCode, xmlUrl, pdfUrl, errorMessage, invoice.id]
    );

    return {
      handled: true,
      invoiceId: invoice.id,
      status: newStatus,
    };
  }

  /**
   * Emissão automática se configurada na transição de status (chamado sem bloquear a transação principal)
   */
  async autoIssueIfConfigured(
    tenantId: string,
    workOrderId: string,
    trigger: 'delivery' | 'payment'
  ): Promise<void> {
    try {
      const settings = await this.getFiscalSettings(tenantId);
      const shouldIssue = trigger === 'delivery' 
        ? settings.autoIssueOnDelivery 
        : settings.autoIssueOnPayment;

      if (!shouldIssue) return;

      // Se elegível, emite em segundo plano
      await this.issueWorkOrderNfse(tenantId, workOrderId);
    } catch {
      // Falha de emissão automática nunca deve quebrar o fluxo operacional de entrega ou quitação
    }
  }

  private async getInvoiceById(tenantId: string, id: string): Promise<FiscalInvoiceDto | null> {
    const res = await tenantQuery<any>(
      tenantId,
      `SELECT * FROM fiscal_invoices WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
      [id, tenantId]
    );
    if (res.rows.length === 0) return null;
    return this.mapInvoiceRow(res.rows[0]);
  }

  private mapInvoiceRow(row: any): FiscalInvoiceDto {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      workOrderId: row.work_order_id,
      customerId: row.customer_id,
      environment: row.environment,
      provider: row.provider,
      providerInvoiceId: row.provider_invoice_id,
      rpsNumber: row.rps_number,
      rpsSeries: row.rps_series,
      invoiceNumber: row.invoice_number,
      verificationCode: row.verification_code,
      status: row.status,
      grossAmountCents: row.gross_amount_cents,
      deductionsCents: row.deductions_cents,
      netAmountCents: row.net_amount_cents,
      issRateBasisPoints: row.iss_rate_basis_points,
      issAmountCents: row.iss_amount_cents,
      description: row.description,
      serviceCode: row.service_code,
      cnaeCode: row.cnae_code,
      errorMessage: row.error_message,
      xmlUrl: row.xml_url,
      pdfUrl: row.pdf_url,
      issuedAt: row.issued_at,
      cancelledAt: row.cancelled_at,
      cancelReason: row.cancel_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const fiscalService = new FiscalService();
