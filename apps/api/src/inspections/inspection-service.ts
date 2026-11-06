import PDFDocument from 'pdfkit';
import { tenantQuery } from '../database/tenant-query.js';
import { storageService } from '../storage/storage-service.js';
import { StorageFileCategory } from '@carx/shared';
import type {
  CreateInspectionInputDto,
  UpdateInspectionInputDto,
  AddDamagePointInputDto,
  AddInspectionPhotoInputDto,
  SignInspectionInputDto,
  InspectionDto,
  InspectionDamagePointDto,
  InspectionPhotoDto,
  InspectionChecklistItemDto,
} from '@carx/shared';

export class InspectionNotFoundError extends Error {
  public statusCode = 404;
  public code = 'INSPECTION_NOT_FOUND';

  constructor(message = 'Inspeção não encontrada.') {
    super(message);
    this.name = 'InspectionNotFoundError';
  }
}

export class InspectionValidationError extends Error {
  public statusCode = 400;
  public code = 'INSPECTION_VALIDATION_ERROR';

  constructor(message: string) {
    super(message);
    this.name = 'InspectionValidationError';
  }
}

export class InspectionService {
  /**
   * Cria uma nova inspeção veicular (VCR)
   */
  async createInspection(
    tenantId: string,
    input: CreateInspectionInputDto
  ): Promise<InspectionDto> {
    // 1. Valida existência da OS no tenant
    const woRes = await tenantQuery<{ id: string; vehicle_id: string; customer_id: string }>(
      tenantId,
      `SELECT id, vehicle_id, customer_id FROM work_orders WHERE tenant_id = $1 AND id = $2 LIMIT 1;`,
      [tenantId, input.workOrderId]
    );

    if (woRes.rows.length === 0) {
      throw new InspectionValidationError('Ordem de serviço informada não existe ou não pertence a esta oficina.');
    }

    const wo = woRes.rows[0];
    const vehicleId = input.vehicleId || wo.vehicle_id;

    // 2. Valida existência do veículo
    const vehRes = await tenantQuery<{ id: string }>(
      tenantId,
      `SELECT id FROM vehicles WHERE tenant_id = $1 AND id = $2 LIMIT 1;`,
      [tenantId, vehicleId]
    );

    if (vehRes.rows.length === 0) {
      throw new InspectionValidationError('Veículo informado não existe ou não pertence a esta oficina.');
    }

    // 3. Checklist padrão caso não informado
    const checklistItems =
      input.checklistItems && input.checklistItems.length > 0
        ? input.checklistItems
        : [
            { id: 'spare_tire', label: 'Estepe / Pneu Reserva', checked: true },
            { id: 'jack', label: 'Macaco e Chave de Roda', checked: true },
            { id: 'triangle', label: 'Triângulo de Sinalização', checked: true },
            { id: 'antenna', label: 'Antena / Palhetas', checked: true },
            { id: 'radio', label: 'Aparelho de Som / Multimídia', checked: true },
            { id: 'air_conditioning', label: 'Ar Condicionado em Operação', checked: true },
            { id: 'lights', label: 'Faróis e Lanternas Funcionando', checked: true },
            { id: 'dashboard_alerts', label: 'Luzes de Alerta no Painel (Injeção/ABS)', checked: false },
          ];

    const res = await tenantQuery<{
      id: string;
      tenant_id: string;
      work_order_id: string;
      vehicle_id: string;
      inspector_id: string | null;
      inspection_type: string;
      vehicle_type: string;
      current_km: number | null;
      fuel_level: string | null;
      checklist_items: any;
      voice_notes: string | null;
      customer_signature_file_id: string | null;
      customer_signature_name: string | null;
      signed_at: string | null;
      pdf_file_id: string | null;
      pdf_generated_at: string | null;
      status: string;
      notes: string | null;
      created_at: string;
      updated_at: string;
    }>(
      tenantId,
      `INSERT INTO inspections (
        tenant_id,
        work_order_id,
        vehicle_id,
        inspector_id,
        inspection_type,
        vehicle_type,
        current_km,
        fuel_level,
        checklist_items,
        voice_notes,
        notes,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'draft')
      RETURNING *;`,
      [
        tenantId,
        wo.id,
        vehicleId,
        input.inspectorId || null,
        input.inspectionType || 'check_in',
        input.vehicleType || 'car',
        input.currentKm ?? null,
        input.fuelLevel || '1/2',
        JSON.stringify(checklistItems),
        input.voiceNotes || null,
        input.notes || null,
      ]
    );

    return this.getInspectionById(tenantId, res.rows[0].id);
  }

  /**
   * Obtém inspeção detalhada com fotos, avarias e dados do veículo
   */
  async getInspectionById(tenantId: string, id: string): Promise<InspectionDto> {
    const res = await tenantQuery<{
      id: string;
      tenant_id: string;
      work_order_id: string;
      vehicle_id: string;
      inspector_id: string | null;
      inspector_name: string | null;
      inspection_type: string;
      vehicle_type: string;
      current_km: number | null;
      fuel_level: string | null;
      checklist_items: any;
      voice_notes: string | null;
      customer_signature_file_id: string | null;
      customer_signature_name: string | null;
      signed_at: string | null;
      pdf_file_id: string | null;
      pdf_generated_at: string | null;
      status: string;
      notes: string | null;
      created_at: string;
      updated_at: string;
      vehicle_plate: string | null;
      vehicle_brand: string | null;
      vehicle_model: string | null;
      vehicle_color: string | null;
      vehicle_year: number | null;
      customer_name: string | null;
      customer_phone: string | null;
      customer_email: string | null;
      os_number: number | null;
      os_status: string | null;
    }>(
      tenantId,
      `SELECT
        i.*,
        u.name as inspector_name,
        v.plate as vehicle_plate,
        v.brand as vehicle_brand,
        v.model as vehicle_model,
        v.color as vehicle_color,
        v.year as vehicle_year,
        c.name as customer_name,
        c.phone as customer_phone,
        c.email as customer_email,
        wo.os_number as os_number,
        wo.status as os_status
      FROM inspections i
      LEFT JOIN users u ON u.id = i.inspector_id
      LEFT JOIN vehicles v ON v.id = i.vehicle_id
      LEFT JOIN work_orders wo ON wo.id = i.work_order_id
      LEFT JOIN customers c ON c.id = wo.customer_id
      WHERE i.tenant_id = $1 AND i.id = $2
      LIMIT 1;`,
      [tenantId, id]
    );

    if (res.rows.length === 0) {
      throw new InspectionNotFoundError('Inspeção não encontrada.');
    }

    const row = res.rows[0];

    // Busca pontos de avaria
    const dpRes = await tenantQuery<{
      id: string;
      tenant_id: string;
      inspection_id: string;
      part: string;
      damage_type: string;
      severity: string;
      x_percent: string;
      y_percent: string;
      view: string;
      photo_file_id: string | null;
      notes: string | null;
      created_at: string;
    }>(
      tenantId,
      `SELECT * FROM inspection_damage_points
       WHERE tenant_id = $1 AND inspection_id = $2
       ORDER BY created_at ASC;`,
      [tenantId, id]
    );

    const damagePoints: InspectionDamagePointDto[] = await Promise.all(
      dpRes.rows.map(async (dp) => {
        let photoUrl: string | null = null;
        if (dp.photo_file_id) {
          try {
            const urlData = await storageService.getDownloadUrl(tenantId, dp.photo_file_id);
            photoUrl = urlData.downloadUrl;
          } catch {
            photoUrl = null;
          }
        }
        return {
          id: dp.id,
          tenantId: dp.tenant_id,
          inspectionId: dp.inspection_id,
          part: dp.part,
          damageType: dp.damage_type,
          severity: dp.severity as any,
          xPercent: Number(dp.x_percent),
          yPercent: Number(dp.y_percent),
          view: dp.view as any,
          photoFileId: dp.photo_file_id,
          photoUrl,
          notes: dp.notes,
          createdAt: dp.created_at,
        };
      })
    );

    // Busca fotos guiadas
    const photosRes = await tenantQuery<{
      id: string;
      tenant_id: string;
      inspection_id: string;
      photo_file_id: string;
      angle: string;
      phase: string;
      caption: string | null;
      created_at: string;
    }>(
      tenantId,
      `SELECT * FROM inspection_photos
       WHERE tenant_id = $1 AND inspection_id = $2
       ORDER BY created_at ASC;`,
      [tenantId, id]
    );

    const photos: InspectionPhotoDto[] = await Promise.all(
      photosRes.rows.map(async (p) => {
        let photoUrl: string | null = null;
        try {
          const urlData = await storageService.getDownloadUrl(tenantId, p.photo_file_id);
          photoUrl = urlData.downloadUrl;
        } catch {
          photoUrl = null;
        }
        return {
          id: p.id,
          tenantId: p.tenant_id,
          inspectionId: p.inspection_id,
          photoFileId: p.photo_file_id,
          photoUrl,
          angle: p.angle,
          phase: p.phase as any,
          caption: p.caption,
          createdAt: p.created_at,
        };
      })
    );

    // Assinatura e PDF URLs
    let customerSignatureUrl: string | null = null;
    if (row.customer_signature_file_id) {
      try {
        const sigUrl = await storageService.getDownloadUrl(tenantId, row.customer_signature_file_id);
        customerSignatureUrl = sigUrl.downloadUrl;
      } catch {
        customerSignatureUrl = null;
      }
    }

    let pdfUrl: string | null = null;
    if (row.pdf_file_id) {
      try {
        const pUrl = await storageService.getDownloadUrl(tenantId, row.pdf_file_id);
        pdfUrl = pUrl.downloadUrl;
      } catch {
        pdfUrl = null;
      }
    }

    const checklistItems =
      typeof row.checklist_items === 'string'
        ? JSON.parse(row.checklist_items)
        : row.checklist_items || [];

    return {
      id: row.id,
      tenantId: row.tenant_id,
      workOrderId: row.work_order_id,
      vehicleId: row.vehicle_id,
      inspectorId: row.inspector_id,
      inspectorName: row.inspector_name,
      inspectionType: row.inspection_type as any,
      vehicleType: row.vehicle_type as any,
      currentKm: row.current_km,
      fuelLevel: row.fuel_level,
      checklistItems,
      voiceNotes: row.voice_notes,
      customerSignatureFileId: row.customer_signature_file_id,
      customerSignatureUrl,
      customerSignatureName: row.customer_signature_name,
      signedAt: row.signed_at,
      pdfFileId: row.pdf_file_id,
      pdfUrl,
      pdfGeneratedAt: row.pdf_generated_at,
      status: row.status as any,
      notes: row.notes,
      damagePoints,
      photos,
      vehicle: row.vehicle_plate
        ? {
            plate: row.vehicle_plate,
            brand: row.vehicle_brand || '',
            model: row.vehicle_model || '',
            color: row.vehicle_color,
            year: row.vehicle_year,
          }
        : undefined,
      customer: row.customer_name
        ? {
            name: row.customer_name,
            phone: row.customer_phone,
            email: row.customer_email,
          }
        : undefined,
      workOrder: row.os_number
        ? {
            osNumber: row.os_number,
            status: row.os_status || 'draft',
          }
        : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Lista inspeções vinculadas a uma Ordem de Serviço
   */
  async listByWorkOrder(tenantId: string, workOrderId: string): Promise<InspectionDto[]> {
    const res = await tenantQuery<{ id: string }>(
      tenantId,
      `SELECT id FROM inspections WHERE tenant_id = $1 AND work_order_id = $2 ORDER BY created_at DESC;`,
      [tenantId, workOrderId]
    );

    return Promise.all(res.rows.map((r) => this.getInspectionById(tenantId, r.id)));
  }

  /**
   * Atualiza dados gerais da inspeção
   */
  async updateInspection(
    tenantId: string,
    id: string,
    input: UpdateInspectionInputDto
  ): Promise<InspectionDto> {
    const existing = await this.getInspectionById(tenantId, id);

    const updates: string[] = [];
    const values: any[] = [tenantId, id];
    let idx = 3;

    if (input.currentKm !== undefined) {
      updates.push(`current_km = $${idx++}`);
      values.push(input.currentKm);
    }
    if (input.fuelLevel !== undefined) {
      updates.push(`fuel_level = $${idx++}`);
      values.push(input.fuelLevel);
    }
    if (input.checklistItems !== undefined) {
      updates.push(`checklist_items = $${idx++}`);
      values.push(JSON.stringify(input.checklistItems));
    }
    if (input.voiceNotes !== undefined) {
      updates.push(`voice_notes = $${idx++}`);
      values.push(input.voiceNotes);
    }
    if (input.notes !== undefined) {
      updates.push(`notes = $${idx++}`);
      values.push(input.notes);
    }
    if (input.status !== undefined) {
      updates.push(`status = $${idx++}`);
      values.push(input.status);
    }

    if (updates.length > 0) {
      updates.push(`updated_at = NOW()`);
      await tenantQuery(
        tenantId,
        `UPDATE inspections
         SET ${updates.join(', ')}
         WHERE tenant_id = $1 AND id = $2;`,
        values
      );
    }

    return this.getInspectionById(tenantId, id);
  }

  /**
   * Adiciona um ponto de avaria marcado na silhueta
   */
  async addDamagePoint(
    tenantId: string,
    inspectionId: string,
    input: AddDamagePointInputDto
  ): Promise<InspectionDamagePointDto> {
    // Confirma que a inspeção existe e pertence ao tenant
    await this.getInspectionById(tenantId, inspectionId);

    const res = await tenantQuery<{
      id: string;
      tenant_id: string;
      inspection_id: string;
      part: string;
      damage_type: string;
      severity: string;
      x_percent: string;
      y_percent: string;
      view: string;
      photo_file_id: string | null;
      notes: string | null;
      created_at: string;
    }>(
      tenantId,
      `INSERT INTO inspection_damage_points (
        tenant_id,
        inspection_id,
        part,
        damage_type,
        severity,
        x_percent,
        y_percent,
        view,
        photo_file_id,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;`,
      [
        tenantId,
        inspectionId,
        input.part,
        input.damageType,
        input.severity || 'medium',
        input.xPercent,
        input.yPercent,
        input.view || 'top',
        input.photoFileId || null,
        input.notes || null,
      ]
    );

    const dp = res.rows[0];
    let photoUrl: string | null = null;
    if (dp.photo_file_id) {
      try {
        const fileUrl = await storageService.getDownloadUrl(tenantId, dp.photo_file_id);
        photoUrl = fileUrl.downloadUrl;
      } catch {
        photoUrl = null;
      }
    }

    return {
      id: dp.id,
      tenantId: dp.tenant_id,
      inspectionId: dp.inspection_id,
      part: dp.part,
      damageType: dp.damage_type,
      severity: dp.severity as any,
      xPercent: Number(dp.x_percent),
      yPercent: Number(dp.y_percent),
      view: dp.view as any,
      photoFileId: dp.photo_file_id,
      photoUrl,
      notes: dp.notes,
      createdAt: dp.created_at,
    };
  }

  /**
   * Remove um ponto de avaria da inspeção
   */
  async removeDamagePoint(
    tenantId: string,
    inspectionId: string,
    damagePointId: string
  ): Promise<boolean> {
    await this.getInspectionById(tenantId, inspectionId);

    const res = await tenantQuery(
      tenantId,
      `DELETE FROM inspection_damage_points
       WHERE tenant_id = $1 AND inspection_id = $2 AND id = $3;`,
      [tenantId, inspectionId, damagePointId]
    );

    return (res.rowCount || 0) > 0;
  }

  /**
   * Adiciona foto guiada à inspeção
   */
  async addPhoto(
    tenantId: string,
    inspectionId: string,
    input: AddInspectionPhotoInputDto
  ): Promise<InspectionPhotoDto> {
    await this.getInspectionById(tenantId, inspectionId);

    const res = await tenantQuery<{
      id: string;
      tenant_id: string;
      inspection_id: string;
      photo_file_id: string;
      angle: string;
      phase: string;
      caption: string | null;
      created_at: string;
    }>(
      tenantId,
      `INSERT INTO inspection_photos (
        tenant_id,
        inspection_id,
        photo_file_id,
        angle,
        phase,
        caption
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;`,
      [
        tenantId,
        inspectionId,
        input.photoFileId,
        input.angle,
        input.phase || 'before',
        input.caption || null,
      ]
    );

    const p = res.rows[0];
    let photoUrl: string | null = null;
    try {
      const fileUrl = await storageService.getDownloadUrl(tenantId, p.photo_file_id);
      photoUrl = fileUrl.downloadUrl;
    } catch {
      photoUrl = null;
    }

    return {
      id: p.id,
      tenantId: p.tenant_id,
      inspectionId: p.inspection_id,
      photoFileId: p.photo_file_id,
      photoUrl,
      angle: p.angle,
      phase: p.phase as any,
      caption: p.caption,
      createdAt: p.created_at,
    };
  }

  /**
   * Remove foto da inspeção
   */
  async removePhoto(
    tenantId: string,
    inspectionId: string,
    photoId: string
  ): Promise<boolean> {
    await this.getInspectionById(tenantId, inspectionId);

    const res = await tenantQuery(
      tenantId,
      `DELETE FROM inspection_photos
       WHERE tenant_id = $1 AND inspection_id = $2 AND id = $3;`,
      [tenantId, inspectionId, photoId]
    );

    return (res.rowCount || 0) > 0;
  }

  /**
   * Assina digitalmente a inspeção (salvando imagem no MinIO sem Base64 no banco de dados)
   */
  async signInspection(
    tenantId: string,
    inspectionId: string,
    input: SignInspectionInputDto
  ): Promise<InspectionDto> {
    const inspection = await this.getInspectionById(tenantId, inspectionId);

    // Converte assinatura Base64 para Buffer binário
    let base64Clean = input.signatureBase64;
    if (base64Clean.includes('base64,')) {
      base64Clean = base64Clean.split('base64,')[1];
    }
    const signatureBuffer = Buffer.from(base64Clean, 'base64');

    if (signatureBuffer.length === 0) {
      throw new InspectionValidationError('Arquivo de assinatura corrompido ou vazio.');
    }

    // Salva o arquivo de assinatura no MinIO / S3 isolado por tenant
    const originalName = `signature_${inspectionId}_${Date.now()}.png`;
    const uploadedSig = await storageService.uploadFile(tenantId, {
      buffer: signatureBuffer,
      originalName,
      declaredMimeType: 'image/png',
      category: StorageFileCategory.INSPECTION,
      entityId: inspectionId,
    });

    // Atualiza tabela inspections apenas com a referência do arquivo e timestamp
    await tenantQuery(
      tenantId,
      `UPDATE inspections
       SET customer_signature_file_id = $3,
           customer_signature_name = $4,
           signed_at = NOW(),
           status = 'signed',
           updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2;`,
      [tenantId, inspectionId, uploadedSig.id, input.customerSignatureName]
    );

    return this.getInspectionById(tenantId, inspectionId);
  }

  /**
   * Gera o laudo técnico veicular em PDF com desenho vetorial da silhueta,
   * avarias plotadas, checklist e assinaturas, persistindo o PDF gerado no MinIO.
   */
  async generateInspectionPdf(
    tenantId: string,
    inspectionId: string
  ): Promise<{ pdfBuffer: Buffer; inspection: InspectionDto }> {
    const inspection = await this.getInspectionById(tenantId, inspectionId);

    // Busca dados do tenant / oficina para o cabeçalho
    const tenantRes = await tenantQuery<{ name: string; slug: string; cnpj: string | null }>(
      tenantId,
      `SELECT COALESCE(trade_name, legal_name, 'Oficina CarX') as name, slug, cnpj FROM tenants WHERE id = $1 LIMIT 1;`,
      [tenantId]
    );
    const tenantInfo = tenantRes.rows[0] || { name: 'Oficina CarX', slug: 'oficina', cnpj: null };

    // Tenta carregar imagem da assinatura se houver
    let signatureBuffer: Buffer | null = null;
    if (inspection.customerSignatureFileId) {
      try {
        signatureBuffer = await storageService.getFileBuffer(tenantId, inspection.customerSignatureFileId);
      } catch (err) {
        console.warn(`[VCR-PDF] Não foi possível ler buffer da assinatura: ${(err as any).message}`);
      }
    }

    // Constrói o documento PDF com PDFKit
    const pdfBuffer = await this.buildPdfDocument(tenantInfo, inspection, signatureBuffer);

    // Salva o PDF no MinIO Storage
    const pdfName = `laudo_vcr_${inspection.vehicle?.plate || 'veiculo'}_${inspectionId.substring(0, 8)}.pdf`;
    const uploadedPdf = await storageService.uploadFile(tenantId, {
      buffer: pdfBuffer,
      originalName: pdfName,
      declaredMimeType: 'application/pdf',
      category: StorageFileCategory.INSPECTION,
      entityId: inspectionId,
    });

    // Vincula pdf_file_id na inspeção
    await tenantQuery(
      tenantId,
      `UPDATE inspections
       SET pdf_file_id = $3,
           pdf_generated_at = NOW(),
           updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2;`,
      [tenantId, inspectionId, uploadedPdf.id]
    );

    const updatedInspection = await this.getInspectionById(tenantId, inspectionId);

    return {
      pdfBuffer,
      inspection: updatedInspection,
    };
  }

  /**
   * Compila o PDF vetorial em memória
   */
  private async buildPdfDocument(
    tenant: { name: string; cnpj: string | null },
    insp: InspectionDto,
    signatureBuffer: Buffer | null
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 36, // 0.5 inch margins
          info: {
            Title: `Laudo VCR - ${insp.vehicle?.plate || 'Veículo'}`,
            Author: tenant.name,
            Subject: 'Laudo de Inspeção e Vistoria Digital do Veículo',
            Creator: 'CarX SaaS Automotive Platform',
          },
        });

        const buffers: Buffer[] = [];
        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', (err) => reject(err));

        // ==========================================
        // 1. CABEÇALHO DO LAUDO
        // ==========================================
        doc.rect(36, 36, 523, 50).fill('#0f172a'); // Fundo Slate 900 escuro moderno

        doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold');
        doc.text('CARX — LAUDO DE INSPEÇÃO DIGITAL (VCR)', 48, 48);

        doc.fillColor('#94a3b8').fontSize(9).font('Helvetica');
        const shopSub = `${tenant.name} ${tenant.cnpj ? '• CNPJ: ' + tenant.cnpj : ''}`;
        doc.text(shopSub, 48, 68);

        doc.fillColor('#38bdf8').fontSize(9).font('Helvetica-Bold');
        const osText = insp.workOrder ? `OS #${insp.workOrder.osNumber}` : 'AVULSA';
        doc.text(
          `STATUS: ${insp.status.toUpperCase()} | ${osText}`,
          36,
          52,
          { align: 'right', width: 511 }
        );

        // ==========================================
        // 2. DADOS DO VEÍCULO, CLIENTE E VISTORIA
        // ==========================================
        let y = 98;
        doc.rect(36, y, 523, 62).fill('#f8fafc').strokeColor('#e2e8f0').stroke();

        doc.fillColor('#1e293b').fontSize(8).font('Helvetica-Bold');
        doc.text('VEÍCULO:', 48, y + 8);
        doc.font('Helvetica').text(
          `${insp.vehicle?.brand || ''} ${insp.vehicle?.model || 'Não especificado'} (${insp.vehicle?.year || 'S/A'}) - Cor: ${insp.vehicle?.color || 'N/I'}`,
          100,
          y + 8
        );

        doc.font('Helvetica-Bold').text('PLACA:', 48, y + 22);
        doc.font('Helvetica-Bold').fillColor('#0284c7').text(insp.vehicle?.plate || 'SEM PLACA', 100, y + 22);

        doc.font('Helvetica-Bold').fillColor('#1e293b').text('KM / COMBUSTÍVEL:', 48, y + 36);
        doc.font('Helvetica').text(
          `${insp.currentKm ? insp.currentKm.toLocaleString('pt-BR') + ' km' : 'Não informado'} | Nível: ${insp.fuelLevel || '1/2'}`,
          160,
          y + 36
        );

        // Lado direito da caixa de dados
        doc.font('Helvetica-Bold').text('CLIENTE:', 310, y + 8);
        doc.font('Helvetica').text(`${insp.customer?.name || 'Cliente Balcão'}`, 365, y + 8);

        doc.font('Helvetica-Bold').text('CONTATO:', 310, y + 22);
        doc.font('Helvetica').text(`${insp.customer?.phone || insp.customer?.email || 'N/I'}`, 365, y + 22);

        doc.font('Helvetica-Bold').text('INSPEÇÃO:', 310, y + 36);
        const dataFormatada = new Date(insp.createdAt).toLocaleDateString('pt-BR');
        doc.font('Helvetica').text(
          `Tipo: ${insp.inspectionType.toUpperCase()} | Data: ${dataFormatada}`,
          365,
          y + 36
        );

        // ==========================================
        // 3. MAPA VISUAL DA SILHUETA DO VEÍCULO (TOP VIEW)
        // ==========================================
        y = 172;
        doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold');
        doc.text('1. MAPA DE AVARIAS E CONDIÇÃO DA CARROCERIA (VCR TOUCH)', 36, y);

        y += 16;
        const boxX = 36;
        const boxY = y;
        const boxW = 523;
        const boxH = 175;

        // Fundo do box do carro
        doc.rect(boxX, boxY, boxW, boxH).fill('#f1f5f9').strokeColor('#cbd5e1').stroke();

        // Desenho vetorial da silhueta esquemática do automóvel
        const carCenterX = boxX + boxW / 2;
        const carCenterY = boxY + boxH / 2;
        const carW = 280;
        const carH = 120;
        const carX = carCenterX - carW / 2;
        const carY = carCenterY - carH / 2;

        // Corpo do Carro (Visão Superior Esquemática)
        doc.roundedRect(carX, carY, carW, carH, 25).fillAndStroke('#ffffff', '#64748b');

        // Para-brisa dianteiro (lado esquerdo)
        doc.roundedRect(carX + 45, carY + 12, 45, carH - 24, 6).fillAndStroke('#e2e8f0', '#94a3b8');
        // Teto central
        doc.rect(carX + 95, carY + 10, 90, carH - 20).fillAndStroke('#f8fafc', '#94a3b8');
        // Vidro traseiro (lado direito)
        doc.roundedRect(carX + 190, carY + 12, 45, carH - 24, 6).fillAndStroke('#e2e8f0', '#94a3b8');

        // Divisões de portas e capô
        doc.moveTo(carX + 45, carY).lineTo(carX + 45, carY + carH).strokeColor('#94a3b8').stroke();
        doc.moveTo(carX + 140, carY).lineTo(carX + 140, carY + 10).strokeColor('#94a3b8').stroke();
        doc.moveTo(carX + 140, carY + carH - 10).lineTo(carX + 140, carY + carH).strokeColor('#94a3b8').stroke();
        doc.moveTo(carX + 235, carY).lineTo(carX + 235, carY + carH).strokeColor('#94a3b8').stroke();

        // Rótulos de orientação
        doc.fillColor('#64748b').fontSize(7).font('Helvetica-Bold');
        doc.text('FRENTE / CAPÔ', carX + 5, carCenterY - 3);
        doc.text('TRASEIRA / PORTA-MALAS', carX + 238, carCenterY - 3);
        doc.text('LATERAL ESQUERDA', carCenterX - 35, carY + 2);
        doc.text('LATERAL DIREITA', carCenterX - 32, carY + carH - 8);

        // Plotagem dos Pontos de Avaria registrados na Silhueta
        const damagePoints = insp.damagePoints || [];
        damagePoints.forEach((dp, index) => {
          const ptNumber = index + 1;
          const plotX = boxX + (dp.xPercent / 100) * boxW;
          const plotY = boxY + (dp.yPercent / 100) * boxH;

          // Cores conforme severidade
          let dotColor = '#f59e0b'; // medium: âmbar
          if (dp.severity === 'low') dotColor = '#10b981'; // verde / suave
          if (dp.severity === 'high') dotColor = '#ef4444'; // vermelho
          if (dp.severity === 'critical') dotColor = '#7f1d1d'; // bordô crítico

          // Círculo com halo
          doc.circle(plotX, plotY, 9).fill(dotColor);
          doc.circle(plotX, plotY, 9).strokeColor('#ffffff').lineWidth(1.5).stroke();

          // Número dentro do círculo
          doc.fillColor('#ffffff').fontSize(7).font('Helvetica-Bold');
          doc.text(String(ptNumber), plotX - 3, plotY - 3.5);
        });

        // ==========================================
        // 4. TABELA DE AVARIAS DESCRITIVAS
        // ==========================================
        y = boxY + boxH + 14;
        doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold');
        doc.text(`2. DETALHAMENTO DE AVARIAS IDENTIFICADAS (${damagePoints.length})`, 36, y);

        y += 14;
        // Cabeçalho da Tabela
        doc.rect(36, y, 523, 16).fill('#0f172a');
        doc.fillColor('#ffffff').fontSize(7).font('Helvetica-Bold');
        doc.text('#', 42, y + 4);
        doc.text('PEÇA / COMPONENTE', 60, y + 4);
        doc.text('TIPO DE AVARIA', 180, y + 4);
        doc.text('GRAVIDADE', 270, y + 4);
        doc.text('VISTA', 340, y + 4);
        doc.text('OBSERVAÇÕES', 400, y + 4);

        y += 16;
        if (damagePoints.length === 0) {
          doc.rect(36, y, 523, 16).fill('#f8fafc').strokeColor('#e2e8f0').stroke();
          doc.fillColor('#10b981').fontSize(8).font('Helvetica-Bold');
          doc.text('Nenhuma avaria externa registrada. Veículo em perfeito estado aparente.', 48, y + 4);
          y += 18;
        } else {
          damagePoints.forEach((dp, idx) => {
            const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
            doc.rect(36, y, 523, 16).fill(rowBg).strokeColor('#e2e8f0').stroke();

            doc.fillColor('#0f172a').fontSize(7).font('Helvetica-Bold');
            doc.text(String(idx + 1), 42, y + 4);
            doc.font('Helvetica').text(dp.part.replace(/_/g, ' ').toUpperCase(), 60, y + 4);
            doc.text(dp.damageType.toUpperCase(), 180, y + 4);

            let sevColor = '#d97706';
            if (dp.severity === 'low') sevColor = '#059669';
            if (dp.severity === 'high' || dp.severity === 'critical') sevColor = '#dc2626';

            doc.fillColor(sevColor).font('Helvetica-Bold').text(dp.severity.toUpperCase(), 270, y + 4);
            doc.fillColor('#334155').font('Helvetica').text(dp.view.toUpperCase(), 340, y + 4);
            doc.text(dp.notes || '—', 400, y + 4, { width: 150, ellipsis: true });

            y += 16;
          });
        }

        // ==========================================
        // 5. CHECKLIST DE ENTRADA / SAÍDA
        // ==========================================
        y += 10;
        doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold');
        doc.text('3. CHECKLIST DE ITENS E ACESSÓRIOS', 36, y);

        y += 14;
        const items = insp.checklistItems || [];
        const colW = 255;
        let curCol = 0;
        let checklistStartY = y;

        items.forEach((item, index) => {
          const itemX = 36 + curCol * (colW + 13);
          const itemY = checklistStartY + Math.floor(index / 2) * 14;

          const isOk = item.checked;
          const statusIcon = isOk ? '[OK]' : '[ ! ]';
          const iconColor = isOk ? '#16a34a' : '#dc2626';

          doc.fillColor(iconColor).fontSize(7).font('Helvetica-Bold');
          doc.text(statusIcon, itemX, itemY);

          doc.fillColor('#1e293b').fontSize(7).font('Helvetica');
          doc.text(item.label, itemX + 22, itemY);

          curCol = (curCol + 1) % 2;
        });

        y = checklistStartY + Math.ceil(items.length / 2) * 14 + 18;

        // ==========================================
        // 6. TERMO DE RESPONSABILIDADE & ASSINATURA DIGITAL
        // ==========================================
        if (y > 700) {
          doc.addPage();
          y = 36;
        }

        doc.rect(36, y, 523, 75).fill('#f8fafc').strokeColor('#cbd5e1').stroke();

        doc.fillColor('#0f172a').fontSize(8).font('Helvetica-Bold');
        doc.text('DECLARAÇÃO DE VISTORIA E CONCORDÂNCIA', 46, y + 8);

        doc.fillColor('#475569').fontSize(7).font('Helvetica');
        const termo =
          'O cliente signatário atesta que o mapa de avarias, quilometragem, nível de combustível e checklist acima refletem com fidelidade as condições do veículo no ato desta vistoria. Autoriza a execução dos serviços contratados.';
        doc.text(termo, 46, y + 20, { width: 330 });

        // Área da Assinatura Digital do Cliente
        const sigBoxX = 390;
        const sigBoxY = y + 8;
        doc.rect(sigBoxX, sigBoxY, 155, 58).strokeColor('#94a3b8').stroke();

        if (signatureBuffer) {
          try {
            doc.image(signatureBuffer, sigBoxX + 5, sigBoxY + 5, { fit: [145, 38], align: 'center' });
          } catch (err) {
            doc.fillColor('#dc2626').fontSize(7).text('Assinatura salva no S3', sigBoxX + 10, sigBoxY + 20);
          }
        } else {
          doc.fillColor('#94a3b8').fontSize(7).font('Helvetica-Oblique');
          doc.text('Aguardando assinatura digital', sigBoxX + 20, sigBoxY + 22);
        }

        doc.fillColor('#1e293b').fontSize(6).font('Helvetica-Bold');
        const signatario = insp.customerSignatureName || insp.customer?.name || 'Cliente';
        doc.text(signatario.toUpperCase(), sigBoxX + 5, sigBoxY + 45, { width: 145, align: 'center' });

        // Rodapé de Auditoria e Certificação
        y += 82;
        doc.fillColor('#94a3b8').fontSize(6).font('Helvetica');
        const emissionDate = new Date().toLocaleString('pt-BR');
        doc.text(
          `Documento gerado eletronicamente em ${emissionDate} via Plataforma CarX • ID: ${insp.id} • Integridade garantida por SHA-256`,
          36,
          y,
          { align: 'center', width: 523 }
        );

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

export const inspectionService = new InspectionService();
