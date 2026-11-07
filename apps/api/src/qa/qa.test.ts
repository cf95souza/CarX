import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { buildServer } from '../server.js';
import { tenantQuery } from '../database/tenant-query.js';
import { signJwt } from '../auth/jwt.js';
import { hashPassword } from '../auth/password.js';
import { WorkOrderStatus } from '@carx/shared';

describe('T3.9 — Controle de Qualidade (QA), Garantia e Certificado com QR (Passaporte)', () => {
  let app: any;
  const timestamp = Date.now();

  // Oficina Alpha
  let tenantAlphaId: string;
  let tenantAlphaSlug: string;
  let ownerAlphaId: string;
  let ownerAlphaToken: string;
  let techAlphaId: string;
  let techAlphaToken: string;
  let customerAlphaId: string;
  let vehicleAlphaId: string;
  let workOrderApprovedId: string;
  let workOrderRejectId: string;

  // Oficina Beta (Concorrente)
  let tenantBetaId: string;
  let tenantBetaSlug: string;
  let ownerBetaId: string;
  let ownerBetaToken: string;

  let createdWarrantyId: string;
  let createdVerificationToken: string;

  before(async () => {
    app = buildServer();
    await app.ready();

    const passHash = await hashPassword('SenhaSegura123!');

    // 1. Setup Oficina Alpha
    tenantAlphaSlug = `alpha-qa-${timestamp}`;
    const resAlpha = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO tenants (trade_name, legal_name, email, slug, cnpj, status, segment)
       VALUES ('CarX Detailing Alpha', 'Alpha Estética LTDA', $1, $2, '11.222.333/0001-99', 'active', 'estetica')
       RETURNING id;`,
      [`contato@${tenantAlphaSlug}.local`, tenantAlphaSlug],
      { bypassRls: true }
    );
    tenantAlphaId = resAlpha.rows[0].id;

    // Usuário Gestor/Owner Alpha
    const resOwnerAlpha = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Gestor Marcelo', $1, $2)
       RETURNING id;`,
      [`gestor@${tenantAlphaSlug}.local`, passHash],
      { bypassRls: true }
    );
    ownerAlphaId = resOwnerAlpha.rows[0].id;
    await tenantQuery(
      null,
      `INSERT INTO memberships (tenant_id, user_id, role)
       VALUES ($1, $2, 'gestor');`,
      [tenantAlphaId, ownerAlphaId],
      { bypassRls: true }
    );
    ownerAlphaToken = signJwt({
      userId: ownerAlphaId,
      tenantId: tenantAlphaId,
      role: 'gestor',
    });

    // Usuário Técnico Alpha (para validar restrição de RBAC)
    const resTechAlpha = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Técnico Bruno', $1, $2)
       RETURNING id;`,
      [`tecnico@${tenantAlphaSlug}.local`, passHash],
      { bypassRls: true }
    );
    techAlphaId = resTechAlpha.rows[0].id;
    await tenantQuery(
      null,
      `INSERT INTO memberships (tenant_id, user_id, role)
       VALUES ($1, $2, 'tecnico');`,
      [tenantAlphaId, techAlphaId],
      { bypassRls: true }
    );
    techAlphaToken = signJwt({
      userId: techAlphaId,
      tenantId: tenantAlphaId,
      role: 'tecnico',
    });

    // Cliente e Veículo Alpha
    const resCust = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO customers (tenant_id, name, email, phone)
       VALUES ($1, 'Carlos Eduardo', 'carlos@cliente.local', '11988887777')
       RETURNING id;`,
      [tenantAlphaId]
    );
    customerAlphaId = resCust.rows[0].id;

    const resVeh = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO vehicles (tenant_id, customer_id, plate, brand, model, color, year, size_class)
       VALUES ($1, $2, 'OPR-2026', 'Porsche', '911 Carrera GTS', 'Cinza Giz', 2024, 'sports')
       RETURNING id;`,
      [tenantAlphaId, customerAlphaId]
    );
    vehicleAlphaId = resVeh.rows[0].id;

    // 1ª OS Alpha (para aprovação no QA)
    const resWoAppr = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO work_orders (tenant_id, customer_id, vehicle_id, technician_id, os_number, status, origin, total_cents, final_cents, estimated_minutes)
       VALUES ($1, $2, $3, $4, 8001, '${WorkOrderStatus.IN_PROGRESS}', 'INTERNAL', 500000, 500000, 240)
       RETURNING id;`,
      [tenantAlphaId, customerAlphaId, vehicleAlphaId, techAlphaId]
    );
    workOrderApprovedId = resWoAppr.rows[0].id;

    // 2ª OS Alpha (para teste de rejeição/retrabalho no QA)
    const resWoRej = await tenantQuery<{ id: string }>(
      tenantAlphaId,
      `INSERT INTO work_orders (tenant_id, customer_id, vehicle_id, technician_id, os_number, status, origin, total_cents, final_cents, estimated_minutes)
       VALUES ($1, $2, $3, $4, 8002, '${WorkOrderStatus.IN_PROGRESS}', 'INTERNAL', 250000, 250000, 120)
       RETURNING id;`,
      [tenantAlphaId, customerAlphaId, vehicleAlphaId, techAlphaId]
    );
    workOrderRejectId = resWoRej.rows[0].id;

    // 2. Setup Oficina Beta (Concorrente)
    tenantBetaSlug = `beta-qa-${timestamp}`;
    const resBeta = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO tenants (trade_name, legal_name, email, slug, cnpj, status, segment)
       VALUES ('Beta Garage', 'Beta Garage LTDA', $1, $2, '99.777.555/0001-11', 'active', 'mecanica')
       RETURNING id;`,
      [`contato@${tenantBetaSlug}.local`, tenantBetaSlug],
      { bypassRls: true }
    );
    tenantBetaId = resBeta.rows[0].id;

    const resOwnerBeta = await tenantQuery<{ id: string }>(
      null,
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Gestor Concorrente', $1, $2)
       RETURNING id;`,
      [`gestor@${tenantBetaSlug}.local`, passHash],
      { bypassRls: true }
    );
    ownerBetaId = resOwnerBeta.rows[0].id;
    await tenantQuery(
      null,
      `INSERT INTO memberships (tenant_id, user_id, role)
       VALUES ($1, $2, 'gestor');`,
      [tenantBetaId, ownerBetaId],
      { bypassRls: true }
    );
    ownerBetaToken = signJwt({
      userId: ownerBetaId,
      tenantId: tenantBetaId,
      role: 'gestor',
    });
  });

  after(async () => {
    await app.close();
  });

  // ============================================================================
  // 1. CONTROLE DE QUALIDADE (QA) E MÁQUINA DE ESTADOS
  // ============================================================================

  test('RBAC: Técnico não pode realizar auditoria de QA (HTTP 403 Forbidden)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/qa/audits',
      headers: {
        authorization: `Bearer ${techAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        workOrderId: workOrderApprovedId,
        status: 'approved',
        score: 5,
      },
    });

    assert.equal(res.statusCode, 403);
  });

  test('deve realizar auditoria de QA aprovada (status: approved) e transicionar OS para READY', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/qa/audits',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        workOrderId: workOrderApprovedId,
        status: 'approved',
        score: 5,
        checklistItems: [
          { id: 'edges', label: 'Bordas e cantos sem descolamento', passed: true },
          { id: 'bubbles', label: 'Ausência total de bolhas de ar ou água', passed: true },
          { id: 'cleaning', label: 'Higienização interna e acabamento dos vidros', passed: true },
        ],
        notes: 'Aplicação impecável, aprovado para entrega.',
      },
    });

    assert.equal(res.statusCode, 201, `Status deve ser 201: ${res.body}`);
    const audit = JSON.parse(res.body);

    assert.equal(audit.status, 'approved');
    assert.equal(audit.score, 5);
    assert.equal(audit.checklistItems.length, 3);
    assert.equal(audit.workOrderId, workOrderApprovedId);

    // Valida transição da OS para READY no banco
    const woCheck = await tenantQuery<{ status: string; is_rework: boolean }>(
      tenantAlphaId,
      `SELECT status, is_rework FROM work_orders WHERE tenant_id = $1 AND id = $2;`,
      [tenantAlphaId, workOrderApprovedId]
    );
    assert.equal(woCheck.rows[0].status, WorkOrderStatus.READY, 'OS deve ter transicionado para READY');
    assert.equal(woCheck.rows[0].is_rework, false);
  });

  test('deve reprovar no QA (rejected_rework), acionar flag is_rework e reposicionar OS em IN_PROGRESS', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/qa/audits',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        workOrderId: workOrderRejectId,
        status: 'rejected_rework',
        score: 2,
        checklistItems: [
          { id: 'edges', label: 'Bordas e cantos sem descolamento', passed: false, notes: 'Borda do vinco soltando' },
          { id: 'bubbles', label: 'Ausência de bolhas', passed: false, notes: 'Bolha de poeira na coluna C' },
        ],
        reworkReason: 'Refazer aplicação na coluna C devido a cisco sob a película',
        notes: 'Devolvido para o técnico Bruno para correção imediata.',
      },
    });

    assert.equal(res.statusCode, 201);
    const audit = JSON.parse(res.body);
    assert.equal(audit.status, 'rejected_rework');
    assert.equal(audit.reworkReason, 'Refazer aplicação na coluna C devido a cisco sob a película');

    // Valida que a OS voltou para IN_PROGRESS com is_rework = true
    const woCheck = await tenantQuery<{ status: string; is_rework: boolean; rework_reason: string }>(
      tenantAlphaId,
      `SELECT status, is_rework, rework_reason FROM work_orders WHERE tenant_id = $1 AND id = $2;`,
      [tenantAlphaId, workOrderRejectId]
    );
    assert.equal(woCheck.rows[0].status, WorkOrderStatus.IN_PROGRESS);
    assert.equal(woCheck.rows[0].is_rework, true, 'is_rework deve ser true');
    assert.equal(woCheck.rows[0].rework_reason, 'Refazer aplicação na coluna C devido a cisco sob a película');
  });

  test('deve consultar o histórico de auditorias da OS', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/work-orders/${workOrderApprovedId}/qa-audits`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.equal(res.statusCode, 200);
    const audits = JSON.parse(res.body);
    assert.ok(Array.isArray(audits));
    assert.equal(audits.length, 1);
    assert.equal(audits[0].status, 'approved');
  });

  // ============================================================================
  // 2. CERTIFICADO DE GARANTIA E PASSAPORTE DIGITAL (T3.9)
  // ============================================================================

  test('deve emitir certificado de garantia com lote de material e PDF gerado', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/warranties',
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        workOrderId: workOrderApprovedId,
        serviceName: 'PPF Front Clip + Vitrificação Cerâmica 9H',
        materialLotNumber: 'XPEL-ULTIMATE-LOT-9021',
        warrantyMonths: 36,
        notes: 'Garantia de 3 anos contra amarelamento, craquelamento e perda de brilho.',
      },
    });

    assert.equal(res.statusCode, 201, `Status deve ser 201: ${res.body}`);
    const warranty = JSON.parse(res.body);

    createdWarrantyId = warranty.id;
    createdVerificationToken = warranty.verificationToken;

    assert.equal(warranty.serviceName, 'PPF Front Clip + Vitrificação Cerâmica 9H');
    assert.equal(warranty.materialLotNumber, 'XPEL-ULTIMATE-LOT-9021');
    assert.equal(warranty.warrantyMonths, 36);
    assert.equal(warranty.status, 'active');
    assert.ok(warranty.verificationToken, 'Deve conter token de verificação único para o QR Code');
    assert.ok(warranty.pdfFileId, 'Deve compilar e anexar o PDF do certificado automaticamente');
    assert.ok(warranty.expiresAt > warranty.startsAt);
  });

  test('CRITÉRIO FUNDAMENTAL: verificação pública do Passaporte (/v/:token) sem token JWT e com blindagem LGPD', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/v/${createdVerificationToken}`,
    });

    assert.equal(res.statusCode, 200, `Status deve ser 200: ${res.body}`);
    const passport = JSON.parse(res.body);

    // Validação da autenticidade da garantia
    assert.equal(passport.isValid, true);
    assert.equal(passport.status, 'active');
    assert.equal(passport.serviceName, 'PPF Front Clip + Vitrificação Cerâmica 9H');
    assert.equal(passport.materialLotNumber, 'XPEL-ULTIMATE-LOT-9021');
    assert.equal(passport.warrantyMonths, 36);
    assert.ok(passport.remainingDays > 1000);

    // Dados públicos do veículo
    assert.equal(passport.vehicle.brand, 'Porsche');
    assert.equal(passport.vehicle.model, '911 Carrera GTS');
    assert.equal(passport.vehicle.year, 2024);

    // CRITÉRIO DE ACEITE LGPD: Placa deve estar ofuscada (ex: OPR-***6)
    assert.match(passport.vehicle.plateMasked, /^OPR-\*{3}[0-9A-Z]$/, 'Placa deve estar ofuscada');

    // CRITÉRIO DE ACEITE LGPD: Nenhum dado sensível do cliente pode ser exposto
    assert.equal(passport.customer, undefined, 'Objeto customer NÃO deve existir na resposta pública');
    assert.equal(passport.cpf, undefined);
    assert.equal(passport.email, undefined);
    assert.equal(passport.phone, undefined);

    // Dados da oficina
    assert.equal(passport.workshop.tradeName, 'CarX Detailing Alpha');
  });

  test('deve realizar download do Certificado em PDF com cabeçalho application/pdf e assinatura mágica', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/warranties/${createdWarrantyId}/pdf`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['content-type'], 'application/pdf');

    const pdfBuffer = res.rawPayload;
    assert.ok(pdfBuffer.length > 1000, 'PDF deve ter tamanho superior a 1KB');

    // Verifica assinatura mágica do PDF (%PDF-)
    const pdfMagic = pdfBuffer.subarray(0, 5).toString('utf-8');
    assert.equal(pdfMagic, '%PDF-', 'Arquivo deve ser um PDF válido compilado pelo motor de laudos');
  });

  test('deve revogar garantia com justificativa e refletir invalidade na consulta pública', async () => {
    const resRevoke = await app.inject({
      method: 'POST',
      url: `/warranties/${createdWarrantyId}/revoke`,
      headers: {
        authorization: `Bearer ${ownerAlphaToken}`,
        'x-tenant-id': tenantAlphaId,
      },
      payload: {
        reason: 'Veículo sofreu colisão grave com perda total da frente, anulando cobertura do PPF.',
      },
    });

    assert.equal(resRevoke.statusCode, 200);
    const revokedWarranty = JSON.parse(resRevoke.body);
    assert.equal(revokedWarranty.status, 'revoked');

    // Consulta pública (/v/:token) agora deve retornar isValid = false e status = revoked
    const resPublic = await app.inject({
      method: 'GET',
      url: `/v/${createdVerificationToken}`,
    });

    assert.equal(resPublic.statusCode, 200);
    const passport = JSON.parse(resPublic.body);
    assert.equal(passport.isValid, false, 'Garantia revogada deve ser marcada como inválida');
    assert.equal(passport.status, 'revoked');
  });

  test('ISOLAMENTO RLS: Oficina Beta não consegue visualizar nem revogar garantia da Oficina Alpha', async () => {
    // 1. Tentar consultar garantia da Alpha
    const resGet = await app.inject({
      method: 'GET',
      url: `/warranties/${createdWarrantyId}`,
      headers: {
        authorization: `Bearer ${ownerBetaToken}`,
        'x-tenant-id': tenantBetaId,
      },
    });
    assert.equal(resGet.statusCode, 404, 'Garantia de outra oficina não pode ser encontrada');

    // 2. Tentar revogar garantia da Alpha
    const resRevoke = await app.inject({
      method: 'POST',
      url: `/warranties/${createdWarrantyId}/revoke`,
      headers: {
        authorization: `Bearer ${ownerBetaToken}`,
        'x-tenant-id': tenantBetaId,
      },
      payload: { reason: 'Tentativa maliciosa de revogação cross-tenant' },
    });
    assert.equal(resRevoke.statusCode, 404);
  });
});

