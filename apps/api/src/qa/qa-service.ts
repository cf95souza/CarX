import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { tenantQuery } from '../database/tenant-query.js';
import { storageService } from '../storage/storage-service.js';
import { auditService } from '../audit/audit-service.js';
import {
  CreateQaAuditInputDto,
  QaAuditDto,
  QaStatusEnum,
  CreateWarrantyInputDto,
  WarrantyDto,
  WarrantyStatusEnum,
  PublicVehiclePassportDto,
  WorkOrderStatus,
} from '@carx/shared';
import { StorageFileCategory } from '@carx/shared';

export class QaError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 400, code = 'QA_ERROR') {
    super(message);
    this.name = 'QaError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class QaService {
  /**
   * Realiza uma auditoria de qualidade (QA) pós-execução na Ordem de Serviço
   */
  async createAudit(
    tenantId: string,
    inspectorId: string,
    input: CreateQaAuditInputDto
  ): Promise<QaAuditDto> {
    // 1. Verifica se a OS existe e pertence à oficina
    const woRes = await tenantQuery<{
      id: string;
      os_number: number;
      status: string;
      customer_id: string;
      vehicle_id: string;
    }>(
      tenantId,
      `SELECT id, os_number, status, customer_id, vehicle_id
       FROM work_orders
       WHERE tenant_id = $1 AND id = $2
       LIMIT 1;`,
      [tenantId, input.workOrderId]
    );

    if (woRes.rows.length === 0) {
      throw new QaError('Ordem de serviço não encontrada.', 404, 'WORK_ORDER_NOT_FOUND');
    }

    const wo = woRes.rows[0];

    // 2. Insere o registro de auditoria em qa_audits
    const auditRes = await tenantQuery<{
      id: string;
      tenant_id: string;
      work_order_id: string;
      inspector_id: string;
      status: string;
      score: number | null;
      checklist_items: any;
      rework_reason: string | null;
      notes: string | null;
      created_at: string;
      updated_at: string;
    }>(
      tenantId,
      `INSERT INTO qa_audits (
        tenant_id,
        work_order_id,
        inspector_id,
        status,
        score,
        checklist_items,
        rework_reason,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;`,
      [
        tenantId,
        input.workOrderId,
        inspectorId,
        input.status,
        input.score ?? null,
        JSON.stringify(input.checklistItems || []),
        input.reworkReason || null,
        input.notes || null,
      ]
    );

    const auditRow = auditRes.rows[0];

    // 3. Regras de Transição e Impacto na OS
    if (input.status === QaStatusEnum.APPROVED) {
      // Se aprovado, transiciona a OS para READY (pronto para retirada do cliente)
      await tenantQuery(
        tenantId,
        `UPDATE work_orders
         SET status = '${WorkOrderStatus.READY}',
             previous_status = status,
             updated_at = NOW()
         WHERE tenant_id = $1 AND id = $2;`,
        [tenantId, input.workOrderId]
      );

      // Registra na trilha de auditoria
      await auditService.record({
        tenantId,
        userId: inspectorId,
        action: 'QA_APPROVED',
        entity: 'work_orders',
        entityId: input.workOrderId,
        newValues: {
          auditId: auditRow.id,
          score: input.score,
          checklistItemsCount: input.checklistItems?.length || 0,
        },
      });
    } else {
      // Se reprovado (rejected_rework):
      // Marca a OS com flag de retrabalho e justificativa, e move para IN_PROGRESS
      // com prioridade máxima na fila do técnico
      const reason = input.reworkReason || 'Reprovado no controle de qualidade (QA)';
      await tenantQuery(
        tenantId,
        `UPDATE work_orders
         SET status = '${WorkOrderStatus.IN_PROGRESS}',
             previous_status = status,
             is_rework = true,
             rework_reason = $3,
             updated_at = NOW()
         WHERE tenant_id = $1 AND id = $2;`,
        [tenantId, input.workOrderId, reason]
      );

      // Registra na trilha de auditoria
      await auditService.record({
        tenantId,
        userId: inspectorId,
        action: 'QA_REJECTED_REWORK',
        entity: 'work_orders',
        entityId: input.workOrderId,
        newValues: {
          auditId: auditRow.id,
          reworkReason: reason,
        },
      });
    }

    return this.mapAuditDto(auditRow);
  }

  /**
   * Consulta auditoria por ID
   */
  async getAuditById(tenantId: string, auditId: string): Promise<QaAuditDto> {
    const res = await tenantQuery<{
      id: string;
      tenant_id: string;
      work_order_id: string;
      inspector_id: string;
      inspector_name?: string;
      status: string;
      score: number | null;
      checklist_items: any;
      rework_reason: string | null;
      notes: string | null;
      created_at: string;
      updated_at: string;
    }>(
      tenantId,
      `SELECT qa.*, u.name as inspector_name
       FROM qa_audits qa
       LEFT JOIN users u ON u.id = qa.inspector_id
       WHERE qa.tenant_id = $1 AND qa.id = $2
       LIMIT 1;`,
      [tenantId, auditId]
    );

    if (res.rows.length === 0) {
      throw new QaError('Auditoria de QA não encontrada.', 404, 'AUDIT_NOT_FOUND');
    }

    return this.mapAuditDto(res.rows[0]);
  }

  /**
   * Lista histórico de auditorias de uma OS
   */
  async listAuditsByWorkOrder(tenantId: string, workOrderId: string): Promise<QaAuditDto[]> {
    const res = await tenantQuery<any>(
      tenantId,
      `SELECT qa.*, u.name as inspector_name
       FROM qa_audits qa
       LEFT JOIN users u ON u.id = qa.inspector_id
       WHERE qa.tenant_id = $1 AND qa.work_order_id = $2
       ORDER BY qa.created_at DESC;`,
      [tenantId, workOrderId]
    );

    return res.rows.map((r) => this.mapAuditDto(r));
  }

  /**
   * Emite um Certificado de Garantia / Passaporte Digital para um serviço executado
   */
  async createWarranty(
    tenantId: string,
    input: CreateWarrantyInputDto
  ): Promise<WarrantyDto> {
    // 1. Busca dados da OS, cliente e veículo
    const woRes = await tenantQuery<{
      id: string;
      customer_id: string;
      vehicle_id: string;
      status: string;
    }>(
      tenantId,
      `SELECT id, customer_id, vehicle_id, status
       FROM work_orders
       WHERE tenant_id = $1 AND id = $2
       LIMIT 1;`,
      [tenantId, input.workOrderId]
    );

    if (woRes.rows.length === 0) {
      throw new QaError('Ordem de serviço não encontrada para emitir garantia.', 404, 'WORK_ORDER_NOT_FOUND');
    }

    const wo = woRes.rows[0];

    // 2. Se foi vinculada uma bobina/rolo de estoque, busca o lote se não informado
    let lotNumber = input.materialLotNumber || null;
    if (input.materialRollId && !lotNumber) {
      const rollRes = await tenantQuery<{ lot_number: string | null }>(
        tenantId,
        `SELECT lot_number FROM material_rolls WHERE tenant_id = $1 AND id = $2 LIMIT 1;`,
        [tenantId, input.materialRollId]
      );
      if (rollRes.rows.length > 0 && rollRes.rows[0].lot_number) {
        lotNumber = rollRes.rows[0].lot_number;
      }
    }

    // 3. Calcula datas de vigência
    const months = input.warrantyMonths || 12;
    const startsAt = new Date();
    const expiresAt = new Date(startsAt);
    expiresAt.setMonth(expiresAt.getMonth() + months);

    const res = await tenantQuery<{
      id: string;
      tenant_id: string;
      work_order_id: string;
      customer_id: string;
      vehicle_id: string;
      service_id: string | null;
      service_name: string;
      material_roll_id: string | null;
      material_lot_number: string | null;
      warranty_months: number;
      starts_at: string;
      expires_at: string;
      verification_token: string;
      pdf_file_id: string | null;
      status: string;
      notes: string | null;
      created_at: string;
      updated_at: string;
    }>(
      tenantId,
      `INSERT INTO warranties (
        tenant_id,
        work_order_id,
        customer_id,
        vehicle_id,
        service_id,
        service_name,
        material_roll_id,
        material_lot_number,
        warranty_months,
        starts_at,
        expires_at,
        status,
        notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active', $12
      )
      RETURNING *;`,
      [
        tenantId,
        wo.id,
        wo.customer_id,
        wo.vehicle_id,
        input.serviceId || null,
        input.serviceName,
        input.materialRollId || null,
        lotNumber,
        months,
        startsAt.toISOString(),
        expiresAt.toISOString(),
        input.notes || null,
      ]
    );

    const warrantyRow = res.rows[0];

    // 4. Gera automaticamente o Certificado em PDF com QR Code
    try {
      await this.generateWarrantyPdf(tenantId, warrantyRow.id);
    } catch (err) {
      console.warn(`[WARRANTY-PDF] Não foi possível compilar o PDF imediatamente: ${(err as any).message}`);
    }

    return this.getWarrantyById(tenantId, warrantyRow.id);
  }

  /**
   * Consulta garantia por ID
   */
  async getWarrantyById(tenantId: string, warrantyId: string): Promise<WarrantyDto> {
    const res = await tenantQuery<any>(
      tenantId,
      `SELECT * FROM warranties WHERE tenant_id = $1 AND id = $2 LIMIT 1;`,
      [tenantId, warrantyId]
    );

    if (res.rows.length === 0) {
      throw new QaError('Certificado de garantia não encontrado.', 404, 'WARRANTY_NOT_FOUND');
    }

    return this.mapWarrantyDto(res.rows[0]);
  }

  /**
   * Lista garantias vinculadas a uma OS
   */
  async listWarrantiesByWorkOrder(tenantId: string, workOrderId: string): Promise<WarrantyDto[]> {
    const res = await tenantQuery<any>(
      tenantId,
      `SELECT * FROM warranties WHERE tenant_id = $1 AND work_order_id = $2 ORDER BY created_at DESC;`,
      [tenantId, workOrderId]
    );

    return res.rows.map((r) => this.mapWarrantyDto(r));
  }

  /**
   * Lista todo o histórico de garantias de um veículo (Passaporte do Veículo na oficina)
   */
  async listWarrantiesByVehicle(tenantId: string, vehicleId: string): Promise<WarrantyDto[]> {
    const res = await tenantQuery<any>(
      tenantId,
      `SELECT * FROM warranties WHERE tenant_id = $1 AND vehicle_id = $2 ORDER BY starts_at DESC;`,
      [tenantId, vehicleId]
    );

    return res.rows.map((r) => this.mapWarrantyDto(r));
  }

  /**
   * Revoga uma garantia (ex: mau uso comprovado ou perícia)
   */
  async revokeWarranty(
    tenantId: string,
    warrantyId: string,
    reason?: string
  ): Promise<WarrantyDto> {
    const res = await tenantQuery<any>(
      tenantId,
      `UPDATE warranties
       SET status = 'revoked',
           notes = COALESCE(notes || E'\n', '') || $3,
           updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2
       RETURNING *;`,
      [tenantId, warrantyId, reason ? `Motivo da Revogação: ${reason}` : 'Garantia revogada manualmente']
    );

    if (res.rows.length === 0) {
      throw new QaError('Garantia não encontrada para revogação.', 404, 'WARRANTY_NOT_FOUND');
    }

    return this.mapWarrantyDto(res.rows[0]);
  }

  /**
   * Verificação Pública do Passaporte do Veículo (QR Code / URL pública `/v/:token`)
   * CRITÉRIO DE ACEITE: Exibe autenticidade, validade e lote do material SEM expor dados pessoais (LGPD).
   */
  async verifyPublicPassport(verificationToken: string): Promise<PublicVehiclePassportDto> {
    // Consulta pública: bypassRls = true pois o token é global e a requisição é não autenticada
    const res = await tenantQuery<{
      id: string;
      tenant_id: string;
      status: string;
      service_name: string;
      material_lot_number: string | null;
      warranty_months: number;
      starts_at: string;
      expires_at: string;
      verification_token: string;
      vehicle_brand: string;
      vehicle_model: string;
      vehicle_plate: string;
      vehicle_year: number;
      vehicle_color: string | null;
      workshop_trade_name: string;
      workshop_phone: string | null;
    }>(
      null,
      `SELECT
         w.id,
         w.tenant_id,
         w.status,
         w.service_name,
         w.material_lot_number,
         w.warranty_months,
         w.starts_at,
         w.expires_at,
         w.verification_token,
         v.brand as vehicle_brand,
         v.model as vehicle_model,
         v.plate as vehicle_plate,
         v.year as vehicle_year,
         v.color as vehicle_color,
         COALESCE(t.trade_name, t.legal_name, 'Oficina CarX') as workshop_trade_name
       FROM warranties w
       JOIN vehicles v ON v.id = w.vehicle_id
       JOIN tenants t ON t.id = w.tenant_id
       WHERE w.verification_token = $1
       LIMIT 1;`,
      [verificationToken],
      { bypassRls: true }
    );

    if (res.rows.length === 0) {
      throw new QaError('Certificado de garantia ou passaporte do veículo não localizado.', 404, 'PASSPORT_NOT_FOUND');
    }

    const row = res.rows[0];

    const now = new Date();
    const expiresAtDate = new Date(row.expires_at);
    const isExpired = expiresAtDate.getTime() < now.getTime();
    const remainingDays = Math.max(0, Math.ceil((expiresAtDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const isValid = row.status === 'active' && !isExpired;

    // Mascaramento da placa para proteção LGPD (Ex: "ABC1D23" -> "ABC-***3")
    const plateRaw = row.vehicle_plate.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    let plateMasked = plateRaw;
    if (plateRaw.length >= 7) {
      plateMasked = `${plateRaw.substring(0, 3)}-***${plateRaw.slice(-1)}`;
    }

    return {
      verificationToken: row.verification_token,
      isValid,
      status: isExpired ? WarrantyStatusEnum.EXPIRED : (row.status as any),
      serviceName: row.service_name,
      materialLotNumber: row.material_lot_number,
      warrantyMonths: row.warranty_months,
      startsAt: new Date(row.starts_at).toISOString(),
      expiresAt: expiresAtDate.toISOString(),
      remainingDays,
      vehicle: {
        brand: row.vehicle_brand,
        model: row.vehicle_model,
        plateMasked,
        year: row.vehicle_year,
        color: row.vehicle_color,
      },
      workshop: {
        tradeName: row.workshop_trade_name,
        phone: null,
        city: null,
      },
    };
  }

  /**
   * Compila o Certificado de Garantia em PDF com QR Code vetorial e salva no MinIO
   */
  async generateWarrantyPdf(
    tenantId: string,
    warrantyId: string
  ): Promise<{ pdfBuffer: Buffer; warranty: WarrantyDto }> {
    // 1. Busca dados da garantia
    const res = await tenantQuery<{
      id: string;
      tenant_id: string;
      work_order_id: string;
      service_name: string;
      material_lot_number: string | null;
      warranty_months: number;
      starts_at: string;
      expires_at: string;
      verification_token: string;
      notes: string | null;
      status: string;
      customer_name: string;
      customer_phone: string | null;
      vehicle_brand: string;
      vehicle_model: string;
      vehicle_plate: string;
      vehicle_year: number;
      vehicle_color: string | null;
      os_number: number;
      trade_name: string;
      legal_name: string;
      cnpj: string | null;
    }>(
      tenantId,
      `SELECT
         w.*,
         c.name as customer_name,
         c.phone as customer_phone,
         v.brand as vehicle_brand,
         v.model as vehicle_model,
         v.plate as vehicle_plate,
         v.year as vehicle_year,
         v.color as vehicle_color,
         wo.os_number,
         COALESCE(t.trade_name, t.legal_name, 'Oficina CarX') as trade_name,
         t.legal_name,
         t.cnpj
       FROM warranties w
       JOIN customers c ON c.id = w.customer_id
       JOIN vehicles v ON v.id = w.vehicle_id
       JOIN work_orders wo ON wo.id = w.work_order_id
       JOIN tenants t ON t.id = w.tenant_id
       WHERE w.tenant_id = $1 AND w.id = $2
       LIMIT 1;`,
      [tenantId, warrantyId]
    );

    if (res.rows.length === 0) {
      throw new QaError('Garantia não encontrada para geração de certificado.', 404, 'WARRANTY_NOT_FOUND');
    }

    const data = res.rows[0];

    // 2. Gera imagem do QR Code
    const verificationUrl = `https://app.carx.com.br/v/${data.verification_token}`;
    const qrBuffer = await QRCode.toBuffer(verificationUrl, {
      width: 140,
      margin: 1,
      color: {
        dark: '#0E1116',
        light: '#FFFFFF',
      },
    });

    // 3. Monta o PDF oficial
    const pdfBuffer = await this.buildWarrantyPdfDocument(data, qrBuffer, verificationUrl);

    // 4. Salva no MinIO
    const fileName = `certificado_garantia_${data.vehicle_plate}_${warrantyId.substring(0, 8)}.pdf`;
    const uploadedFile = await storageService.uploadFile(tenantId, {
      buffer: pdfBuffer,
      originalName: fileName,
      declaredMimeType: 'application/pdf',
      category: StorageFileCategory.WARRANTY,
      entityId: warrantyId,
    });

    // 5. Atualiza tabela warranties com o pdf_file_id
    await tenantQuery(
      tenantId,
      `UPDATE warranties SET pdf_file_id = $3, updated_at = NOW() WHERE tenant_id = $1 AND id = $2;`,
      [tenantId, warrantyId, uploadedFile.id]
    );

    const updatedWarranty = await this.getWarrantyById(tenantId, warrantyId);
    return {
      pdfBuffer,
      warranty: updatedWarranty,
    };
  }

  /**
   * Retorna o buffer do PDF do certificado (compila se ainda não houver)
   */
  async getWarrantyPdfBuffer(tenantId: string, warrantyId: string): Promise<Buffer> {
    const warranty = await this.getWarrantyById(tenantId, warrantyId);

    if (warranty.pdfFileId) {
      try {
        return await storageService.getFileBuffer(tenantId, warranty.pdfFileId);
      } catch (err) {
        console.warn(`[WARRANTY-PDF] Cache não encontrado no MinIO, recompilando: ${(err as any).message}`);
      }
    }

    const generated = await this.generateWarrantyPdf(tenantId, warrantyId);
    return generated.pdfBuffer;
  }

  /**
   * Construtor vetorial do layout do Certificado de Garantia e Passaporte do Veículo
   */
  private buildWarrantyPdfDocument(
    data: any,
    qrCodeBuffer: Buffer,
    verificationUrl: string
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'portrait',
        margin: 40,
        info: {
          Title: `Certificado de Garantia — ${data.vehicle_plate}`,
          Author: data.trade_name || 'CarX Automotive SaaS',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const primaryVolt = '#C8F52E';
      const bgDark = '#0E1116';
      const grayLight = '#F3F4F6';

      // 1. Moldura Decorativa Superior
      doc.rect(40, 40, 515, 6).fill(primaryVolt);
      doc.rect(40, 46, 515, 75).fill(bgDark);

      // Marca da Oficina e Título
      doc.fillColor('#FFFFFF').fontSize(20).font('Helvetica-Bold');
      doc.text((data.trade_name || 'OFICINA CARX').toUpperCase(), 55, 60, { width: 350 });

      doc.fillColor(primaryVolt).fontSize(9).font('Helvetica-Bold');
      doc.text('PASSAPORTE DIGITAL DO VEÍCULO & CERTIFICADO DE GARANTIA', 55, 86);

      doc.fillColor('#9CA3AF').fontSize(8).font('Helvetica');
      doc.text(`OS #${data.os_number} · EMISSÃO: ${new Date(data.starts_at).toLocaleDateString('pt-BR')}`, 55, 100);

      // 2. Quadro do Veículo
      let y = 140;
      doc.rect(40, y, 515, 65).fill(grayLight);
      doc.rect(40, y, 5, 65).fill(bgDark);

      doc.fillColor(bgDark).fontSize(10).font('Helvetica-Bold');
      doc.text('DADOS DO VEÍCULO', 55, y + 10);

      doc.fontSize(9).font('Helvetica');
      doc.text(`Marca / Modelo: ${data.vehicle_brand} ${data.vehicle_model}`, 55, y + 28);
      doc.text(`Placa: ${data.vehicle_plate}    Ano: ${data.vehicle_year}    Cor: ${data.vehicle_color || 'N/I'}`, 55, y + 44);

      // 3. Quadro do Serviço e Garantia
      y = 220;
      doc.rect(40, y, 515, 110).fill('#FAFAFA');
      doc.rect(40, y, 515, 110).stroke('#E5E7EB');

      doc.fillColor(bgDark).fontSize(11).font('Helvetica-Bold');
      doc.text('SERVIÇO COBERTO & TERMOS DA GARANTIA', 55, y + 12);

      doc.fontSize(10).font('Helvetica-Bold').fillColor('#1F2937');
      doc.text(`Serviço Executado: ${data.service_name}`, 55, y + 34);

      doc.fontSize(9).font('Helvetica').fillColor('#4B5563');
      if (data.material_lot_number) {
        doc.text(`Lote / Bobina do Material Aplicado: ${data.material_lot_number}`, 55, y + 54);
      } else {
        doc.text(`Lote do Material: Aplicação padrão certificada`, 55, y + 54);
      }

      const expiresFormatted = new Date(data.expires_at).toLocaleDateString('pt-BR');
      doc.font('Helvetica-Bold').fillColor('#0E1116');
      doc.text(`Prazo de Garantia: ${data.warranty_months} meses (Válido até: ${expiresFormatted})`, 55, y + 74);

      doc.font('Helvetica').fontSize(8).fillColor('#6B7280');
      doc.text(`Status Atual: ${data.status.toUpperCase()}`, 55, y + 92);

      // 4. Instruções e Recomendações de Manutenção
      y = 350;
      doc.fillColor(bgDark).fontSize(10).font('Helvetica-Bold');
      doc.text('CUIDADOS DE MANUTENÇÃO E CONSERVAÇÃO', 40, y);

      doc.fontSize(8.5).font('Helvetica').fillColor('#374151');
      const terms = [
        '1. Respeitar o período de cura de 72 horas sem lavagem ou exposição direta a jatos de alta pressão.',
        '2. Utilizar exclusivamente xampus com pH neutro e luvas de microfibra macias durante as lavagens.',
        '3. Nunca utilizar solventes clorados, ácidos, removedores abrasivos ou ceras com hidrocarbonetos aromáticos.',
        '4. Em caso de películas PPF com autorregeneração (Self-Healing), pequenos riscos superficiais somem com calor solar ou água quente.',
        '5. Qualquer intervenção ou reparo deve ser avaliado obrigatoriamente nesta oficina para preservação da cobertura.',
      ];

      let termY = y + 18;
      for (const t of terms) {
        doc.text(t, 45, termY, { width: 505 });
        termY += 15;
      }

      // 5. Bloco de Autenticidade com QR Code (Passaporte Digital)
      y = 460;
      doc.rect(40, y, 515, 150).fill('#F9FAFB');
      doc.rect(40, y, 515, 150).stroke('#D1D5DB');

      // Desenha o QR Code
      doc.image(qrCodeBuffer, 55, y + 15, { width: 120, height: 120 });

      // Textos informativos ao lado do QR Code
      doc.fillColor(bgDark).fontSize(12).font('Helvetica-Bold');
      doc.text('VERIFICAÇÃO PÚBLICA DE AUTENTICIDADE', 190, y + 20);

      doc.fontSize(9).font('Helvetica').fillColor('#4B5563');
      doc.text(
        'Aponte a câmera do celular para o QR Code ao lado para conferir a validade, histórico e autenticidade deste certificado diretamente na plataforma oficial CarX.',
        190,
        y + 40,
        { width: 345 }
      );

      doc.fontSize(8).font('Helvetica-Bold').fillColor(bgDark);
      doc.text('Código de Verificação Único:', 190, y + 82);
      doc.fontSize(7.5).font('Courier').fillColor('#111827');
      doc.text(data.verification_token, 190, y + 95);

      doc.fontSize(8).font('Helvetica').fillColor('#6B7280');
      doc.text(`Link direto: ${verificationUrl}`, 190, y + 115);

      // Rodapé
      doc.fontSize(7).font('Helvetica').fillColor('#9CA3AF');
      doc.text(
        'Este documento é um passaporte digital protegido pela Lei Geral de Proteção de Dados (LGPD). Dados pessoais não são expostos em consultas públicas.',
        40,
        780,
        { align: 'center', width: 515 }
      );

      doc.end();
    });
  }

  /**
   * Mapeadores
   */
  private mapAuditDto(r: any): QaAuditDto {
    return {
      id: r.id,
      tenantId: r.tenant_id,
      workOrderId: r.work_order_id,
      inspectorId: r.inspector_id,
      inspectorName: r.inspector_name,
      status: r.status,
      score: r.score !== null ? Number(r.score) : null,
      checklistItems: typeof r.checklist_items === 'string' ? JSON.parse(r.checklist_items) : r.checklist_items || [],
      reworkReason: r.rework_reason,
      notes: r.notes,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
    };
  }

  private mapWarrantyDto(r: any): WarrantyDto {
    return {
      id: r.id,
      tenantId: r.tenant_id,
      workOrderId: r.work_order_id,
      customerId: r.customer_id,
      vehicleId: r.vehicle_id,
      serviceId: r.service_id,
      serviceName: r.service_name,
      materialRollId: r.material_roll_id,
      materialLotNumber: r.material_lot_number,
      warrantyMonths: Number(r.warranty_months),
      startsAt: new Date(r.starts_at).toISOString(),
      expiresAt: new Date(r.expires_at).toISOString(),
      verificationToken: r.verification_token,
      pdfFileId: r.pdf_file_id,
      status: r.status,
      notes: r.notes,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
    };
  }
}

export const qaService = new QaService();

