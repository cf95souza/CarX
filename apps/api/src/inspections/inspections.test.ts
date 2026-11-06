import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { FastifyInstance } from 'fastify';
import { buildServer } from '../server.js';
import { tenantQuery } from '../database/tenant-query.js';
import { hashPassword } from '../auth/password.js';
import { signJwt } from '../auth/jwt.js';
import { storageService } from '../storage/storage-service.js';
import { StorageFileCategory } from '@carx/shared';

describe('T3.7 — Laudo de Inspeção Digital (VCR), Checklist e Fotos', () => {
  let app: FastifyInstance;

  // Oficina Alpha
  let tenantAlphaId: string;
  let tenantAlphaSlug: string;
  let ownerAlphaId: string;
  let ownerAlphaToken: string;
  let customerAlphaId: string;
  let vehicleAlphaId: string;
  let workOrderAlphaId: string;

  // Oficina Beta
  let tenantBetaId: string;
  let tenantBetaSlug: string;
  let ownerBetaId: string;
  let ownerBetaToken: string;

  // IDs gerados no teste
  let inspectionId: string;
  let damagePoint1Id: string;
  let damagePoint2Id: string;
  let photoFileId: string;
  let inspectionPhotoId: string;

  before(async () => {
    app = await buildServer();
    await app.ready();

    const timestamp = Date.now();
    const passHash = await hashPassword('CarX@VCR2026!');

    // 1. Setup Oficina Alpha
    tenantAlphaSlug = `alpha-vcr-${timestamp}`;
    const resAlpha = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO tenants (trade_name, legal_name, email, slug, cnpj, status, segment)
       VALUES ('Alpha VCR Auto Detail', 'Alpha VCR LTDA', $1, $2, '12.345.678/0001-90', 'active', 'estetica')
       RETURNING id`,
      [`contato@${tenantAlphaSlug}.local`, tenantAlphaSlug],
      { bypassRls: true }
    );
    tenantAlphaId = resAlpha.rows[0].id;

    // Usuário Alpha
    const resOwnerAlpha = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Vistoriador Alpha', $1, $2)
       RETURNING id`,
      [`vistoria@${tenantAlphaSlug}.local`, passHash],
      { bypassRls: true }
    );
    ownerAlphaId = resOwnerAlpha.rows[0].id;
    await tenantQuery(
      null,
      `INSERT INTO memberships (tenant_id, user_id, role)
       VALUES ($1, $2, 'owner')`,
      [tenantAlphaId, ownerAlphaId],
      { bypassRls: true }
    );
    ownerAlphaToken = signJwt({
      userId: ownerAlphaId,
      tenantId: tenantAlphaId,
      role: 'owner',
    });

    // Cliente Alpha
    const resCustAlpha = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO customers (tenant_id, name, email, phone, document)
       VALUES ($1, 'Carlos Proprietário', 'carlos@vcr-teste.local', '11988887777', '12345678909')
       RETURNING id;`,
      [tenantAlphaId]
    );
    customerAlphaId = resCustAlpha.rows[0].id;

    // Veículo Alpha
    const resVehAlpha = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO vehicles (tenant_id, customer_id, plate, brand, model, color, year, size_class)
       VALUES ($1, $2, 'VCR-2026', 'Porsche', '911 Carrera S', 'Azul Gentian', 2024, 'sports')
       RETURNING id;`,
      [tenantAlphaId, customerAlphaId]
    );
    vehicleAlphaId = resVehAlpha.rows[0].id;

    // OS Alpha
    const resWoAlpha = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO work_orders (tenant_id, customer_id, vehicle_id, os_number, status, origin)
       VALUES ($1, $2, $3, 9110, 'in_progress', 'INTERNAL')
       RETURNING id;`,
      [tenantAlphaId, customerAlphaId, vehicleAlphaId]
    );
    workOrderAlphaId = resWoAlpha.rows[0].id;

    // 2. Setup Oficina Beta
    tenantBetaSlug = `beta-vcr-${timestamp}`;
    const resBeta = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO tenants (trade_name, legal_name, email, slug, cnpj, status, segment)
       VALUES ('Beta Oficina Concorrente', 'Beta LTDA', $1, $2, '98.765.432/0001-11', 'active', 'mecanica')
       RETURNING id`,
      [`contato@${tenantBetaSlug}.local`, tenantBetaSlug],
      { bypassRls: true }
    );
    tenantBetaId = resBeta.rows[0].id;

    const resOwnerBeta = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Gestor Beta', $1, $2)
       RETURNING id`,
      [`gestor@${tenantBetaSlug}.local`, passHash],
      { bypassRls: true }
    );
    ownerBetaId = resOwnerBeta.rows[0].id;
    await tenantQuery(
      null,
      `INSERT INTO memberships (tenant_id, user_id, role)
       VALUES ($1, $2, 'owner')`,
      [tenantBetaId, ownerBetaId],
      { bypassRls: true }
    );
    ownerBetaToken = signJwt({
      userId: ownerBetaId,
      tenantId: tenantBetaId,
      role: 'owner',
    });

    // Upload de um arquivo mock de foto no MinIO para testes de anexos
    // Buffer PNG simples de 1x1 pixel transparente
    const samplePng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    const uploadedPhoto = await storageService.uploadFile(tenantAlphaId, {
      buffer: samplePng,
      originalName: 'foto_inspecao_frente.png',
      declaredMimeType: 'image/png',
      category: StorageFileCategory.INSPECTION,
    });
    photoFileId = uploadedPhoto.id;
  });

  after(async () => {
    await app.close();
  });

  // ============================================================================
  // TESTES DE CRIAÇÃO E CONSULTA DE INSPEÇÃO
  // ============================================================================

  test('deve criar uma inspeção veicular (VCR) com checklist e dados de entrada', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/inspections',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        workOrderId: workOrderAlphaId,
        vehicleId: vehicleAlphaId,
        inspectionType: 'check_in',
        vehicleType: 'car',
        currentKm: 12500,
        fuelLevel: '3/4',
        checklistItems: [
          { id: 'spare_tire', label: 'Estepe / Pneu Reserva', checked: true },
          { id: 'jack', label: 'Macaco e Ferramentas', checked: true },
          { id: 'documents', label: 'Manual e Documento do Veículo', checked: true },
          { id: 'personal_belongings', label: 'Pertences Pessoais Removidos', checked: false, notes: 'Óculos no console' },
        ],
        notes: 'Cliente solicitou atenção especial ao polimento do capô.',
      },
    });

    assert.equal(res.statusCode, 201, `Status deve ser 201 Created: ${res.body}`);
    const data = JSON.parse(res.body);

    assert.ok(data.id, 'Deve retornar o ID da inspeção');
    assert.equal(data.workOrderId, workOrderAlphaId);
    assert.equal(data.vehicleId, vehicleAlphaId);
    assert.equal(data.currentKm, 12500);
    assert.equal(data.fuelLevel, '3/4');
    assert.equal(data.status, 'draft');
    assert.equal(data.vehicle?.plate, 'VCR-2026');
    assert.equal(data.vehicle?.model, '911 Carrera S');
    assert.equal(data.customer?.name, 'Carlos Proprietário');
    assert.equal(data.checklistItems.length, 4);

    inspectionId = data.id;
  });

  test('deve consultar a inspeção por ID com todos os relacionamentos', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/inspections/${inspectionId}`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.equal(res.statusCode, 200);
    const data = JSON.parse(res.body);
    assert.equal(data.id, inspectionId);
    assert.equal(data.workOrder?.osNumber, 9110);
    assert.equal(data.vehicle?.brand, 'Porsche');
  });

  test('deve listar inspeções vinculadas a uma Ordem de Serviço', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/work-orders/${workOrderAlphaId}/inspections`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.equal(res.statusCode, 200);
    const data = JSON.parse(res.body);
    assert.ok(Array.isArray(data));
    assert.ok(data.length >= 1);
    assert.equal(data[0].id, inspectionId);
  });

  // ============================================================================
  // TESTES DE MARCAÇÃO TOUCH DE AVARIAS NA SILHUETA (DAMAGE POINTS)
  // ============================================================================

  test('deve adicionar pontos de avaria com coordenadas percentuais na silhueta (Touch Map)', async () => {
    // Ponto 1: Risco leve no capô
    const res1 = await app.inject({
      method: 'POST',
      url: `/inspections/${inspectionId}/damage-points`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        part: 'capo_central',
        damageType: 'scratch',
        severity: 'low',
        xPercent: 22.5,
        yPercent: 48.0,
        view: 'top',
        notes: 'Micro-risco de chave próximo ao emblema frontal',
      },
    });

    assert.equal(res1.statusCode, 201, `Status deve ser 201: ${res1.body}`);
    const data1 = JSON.parse(res1.body);
    assert.ok(data1.id);
    assert.equal(data1.part, 'capo_central');
    assert.equal(data1.severity, 'low');
    assert.equal(data1.xPercent, 22.5);
    assert.equal(data1.yPercent, 48.0);
    damagePoint1Id = data1.id;

    // Ponto 2: Pequeno amassado na porta dianteira esquerda
    const res2 = await app.inject({
      method: 'POST',
      url: `/inspections/${inspectionId}/damage-points`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        part: 'porta_dianteira_esquerda',
        damageType: 'dent',
        severity: 'high',
        xPercent: 45.0,
        yPercent: 12.0,
        view: 'left',
        photoFileId: photoFileId,
        notes: 'Pequena mossa de batida de estacionamento',
      },
    });

    assert.equal(res2.statusCode, 201);
    const data2 = JSON.parse(res2.body);
    assert.ok(data2.id);
    assert.equal(data2.part, 'porta_dianteira_esquerda');
    assert.equal(data2.severity, 'high');
    assert.ok(data2.photoUrl, 'Deve retornar a URL assinada da foto da avaria');
    damagePoint2Id = data2.id;
  });

  test('deve refletir os pontos de avaria adicionados ao consultar a inspeção', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/inspections/${inspectionId}`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.equal(res.statusCode, 200);
    const data = JSON.parse(res.body);
    assert.equal(data.damagePoints.length, 2);
    assert.equal(data.damagePoints[0].part, 'capo_central');
    assert.equal(data.damagePoints[1].part, 'porta_dianteira_esquerda');
  });

  test('deve permitir remover um ponto de avaria', async () => {
    // Cria um ponto temporário para deletar
    const tempRes = await app.inject({
      method: 'POST',
      url: `/inspections/${inspectionId}/damage-points`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        part: 'teto',
        damageType: 'stain',
        severity: 'low',
        xPercent: 50.0,
        yPercent: 50.0,
        view: 'top',
      },
    });
    const tempPoint = JSON.parse(tempRes.body);

    const delRes = await app.inject({
      method: 'DELETE',
      url: `/inspections/${inspectionId}/damage-points/${tempPoint.id}`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
    });
    assert.equal(delRes.statusCode, 200);
    const delData = JSON.parse(delRes.body);
    assert.equal(delData.success, true);
  });

  // ============================================================================
  // TESTES DE FOTOS GUIADAS DA INSPEÇÃO
  // ============================================================================

  test('deve adicionar foto guiada à inspeção (Inspection Photos)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/inspections/${inspectionId}/photos`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        photoFileId: photoFileId,
        angle: 'front_3_4',
        phase: 'before',
        caption: 'Visão 3/4 dianteira esquerda no check-in',
      },
    });

    assert.equal(res.statusCode, 201, `Status deve ser 201: ${res.body}`);
    const data = JSON.parse(res.body);
    assert.ok(data.id);
    assert.equal(data.photoFileId, photoFileId);
    assert.equal(data.angle, 'front_3_4');
    assert.equal(data.phase, 'before');
    assert.ok(data.photoUrl, 'Deve retornar a URL assinada de download da foto');
    inspectionPhotoId = data.id;
  });

  // ============================================================================
  // TESTES DE ASSINATURA DIGITAL DO CLIENTE (SEM BASE64 NO BANCO!)
  // ============================================================================

  test('deve assinar digitalmente a inspeção salvando no MinIO sem Base64 no banco de dados', async () => {
    // Simula uma assinatura desenhada no canvas do celular / tablet
    const sampleSignatureBase64 =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJYAAAAyCAYAAACF3m55AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAADdJREFUeN7t0DEBAAAAgqD+ry4GvoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/g07+AABq07qkgAAAABJRU5ErkJggg==';

    const res = await app.inject({
      method: 'POST',
      url: `/inspections/${inspectionId}/sign`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        customerSignatureName: 'Carlos Proprietário da Silva',
        signatureBase64: sampleSignatureBase64,
      },
    });

    assert.equal(res.statusCode, 200, `Status deve ser 200: ${res.body}`);
    const data = JSON.parse(res.body);

    assert.equal(data.status, 'signed');
    assert.equal(data.customerSignatureName, 'Carlos Proprietário da Silva');
    assert.ok(data.signedAt, 'Deve ter timestamp de assinatura');
    assert.ok(data.customerSignatureFileId, 'Deve ter ID do arquivo físico no MinIO');
    assert.ok(data.customerSignatureUrl, 'Deve ter URL assinada para visualização da assinatura');

    // Validação estrita no PostgreSQL: verificar que NÃO há Base64 persistido em texto no banco de dados!
    const dbCheck = await tenantQuery<{
      customer_signature_file_id: string;
      customer_signature_name: string;
      status: string;
    }>(
      tenantAlphaId,
      `SELECT customer_signature_file_id, customer_signature_name, status
       FROM inspections
       WHERE tenant_id = $1 AND id = $2;`,
      [tenantAlphaId, inspectionId]
    );

    assert.equal(dbCheck.rows[0].status, 'signed');
    assert.ok(dbCheck.rows[0].customer_signature_file_id);
    assert.equal(typeof dbCheck.rows[0].customer_signature_file_id, 'string');
    // Confirma que é um UUID e não uma string Base64
    assert.match(
      dbCheck.rows[0].customer_signature_file_id,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      'A coluna customer_signature_file_id DEVE ser estritamente um UUID de storage_files e NUNCA Base64'
    );
  });

  // ============================================================================
  // TESTES DE GERAÇÃO DE LAUDO EM PDF SERVER-SIDE
  // ============================================================================

  test('deve gerar o laudo de inspeção em PDF vetorial com mapa de avarias, checklist e assinaturas', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/inspections/${inspectionId}/generate-pdf`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.equal(res.statusCode, 200, `Status deve ser 200: ${res.body}`);
    const data = JSON.parse(res.body);

    assert.ok(data.pdfUrl, 'Deve retornar a URL assinada do laudo PDF no MinIO');
    assert.ok(data.pdfSizeBytes > 1000, `PDF gerado deve ter tamanho substancial: ${data.pdfSizeBytes} bytes`);
    assert.ok(data.inspection.pdfFileId, 'Deve vincular pdf_file_id na inspeção');
    assert.ok(data.inspection.pdfGeneratedAt, 'Deve ter pdf_generated_at');
  });

  test('deve permitir baixar o laudo em PDF diretamente via GET /inspections/:id/pdf', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/inspections/${inspectionId}/pdf`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['content-type'], 'application/pdf');
    assert.ok(res.rawPayload.length > 1000);

    // Valida magic bytes de PDF: deve iniciar com "%PDF-"
    const magicHeader = res.rawPayload.subarray(0, 5).toString('ascii');
    assert.equal(magicHeader, '%PDF-', 'O binário retornado deve ser um arquivo PDF válido');
  });

  // ============================================================================
  // TESTES DE SEGURANÇA E ISOLAMENTO MULTITENANT (RLS)
  // ============================================================================

  test('não deve permitir que Oficina Beta visualize a inspeção da Oficina Alpha (RLS Cross-Tenant)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/inspections/${inspectionId}`,
      headers: {
        authorization: `Bearer ${ownerBetaToken}`,
        'x-tenant-id': tenantBetaId,
      },
    });

    assert.equal(res.statusCode, 404, 'Oficina concorrente não pode ter visibilidade sobre inspeção de outro tenant');
  });

  test('não deve permitir que Oficina Beta adicione avarias à inspeção da Oficina Alpha', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/inspections/${inspectionId}/damage-points`,
      headers: {
        authorization: `Bearer ${ownerBetaToken}`,
        'x-tenant-id': tenantBetaId,
      },
      payload: {
        part: 'para_choque_traseiro',
        damageType: 'dent',
        severity: 'medium',
        xPercent: 80.0,
        yPercent: 50.0,
        view: 'rear',
      },
    });

    assert.equal(res.statusCode, 404, 'Oficina concorrente deve receber 404 devido ao isolamento RLS');
  });

  test('não deve permitir que Oficina Beta acerte ou baixe o PDF da inspeção da Oficina Alpha', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/inspections/${inspectionId}/pdf`,
      headers: {
        authorization: `Bearer ${ownerBetaToken}`,
        'x-tenant-id': tenantBetaId,
      },
    });

    assert.equal(res.statusCode, 404, 'Download de PDF de outro tenant deve ser bloqueado com 404');
  });
});

