import { test, expect } from '@playwright/test';

test.describe.serial('T3.16 — Fluxo Crítico Operacional de Ponta a Ponta (E2E)', () => {
  const timestamp = Date.now();
  let slug = `oficina-e2e-${timestamp}`;
  const ownerEmail = `gestor-${timestamp}@autocenter.com`;
  const ownerPassword = 'Senha@CarX2026!';
  const techEmail = `tecnico-${timestamp}@autocenter.com`;

  let ownerToken: string;
  let techToken: string;
  let techUserId: string;
  let customerId: string;
  let vehicleId: string;
  let bayId: string;
  let workOrderId: string;
  let trackingToken: string;

  test('01. Onboarding e Registro da Oficina com Gestor e Técnico', async ({ request }) => {
    // 1. Cadastrar oficina com papel OWNER
    const regRes = await request.post('/auth/register', {
      data: {
        companyName: `Centro Automotivo E2E ${timestamp}`,
        tenantSlug: slug,
        email: ownerEmail,
        password: ownerPassword,
        name: 'Carlos Gestor E2E',
      },
    });
    expect(regRes.status()).toBe(201);
    const regData = await regRes.json();
    expect(regData.user.email).toBe(ownerEmail);
    slug = regData.membership.tenant_slug;

    // Login para obter access token
    const loginRes = await request.post('/auth/login', {
      data: {
        email: ownerEmail,
        password: ownerPassword,
        tenantSlug: slug,
      },
    });
    expect(loginRes.status()).toBe(200);
    ownerToken = (await loginRes.json()).tokens.accessToken;

    // 2. Upgrade para Plano Profissional (desbloqueia VCR Checklist, Inspeção e NPS)
    const planRes = await request.post('/tenant/plan/change', {
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-tenant-slug': slug,
      },
      data: {
        planSlug: 'profissional',
      },
    });
    expect(planRes.status()).toBe(200);

    // 3. Cadastrar colaborador TÉCNICO
    const techRes = await request.post('/tenant/members', {
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-tenant-slug': slug,
      },
      data: {
        name: 'Roberto Técnico E2E',
        email: techEmail,
        password: ownerPassword,
        role: 'tecnico',
      },
    });
    expect(techRes.status()).toBe(201);
    techUserId = (await techRes.json()).user.id;

    // 4. Login do Técnico
    const loginTechRes = await request.post('/auth/login', {
      headers: { 'x-tenant-slug': slug },
      data: {
        email: techEmail,
        password: ownerPassword,
      },
    });
    expect(loginTechRes.status()).toBe(200);
    techToken = (await loginTechRes.json()).tokens.accessToken;
  });

  test('02. Cadastro de Cliente, Veículo e Box de Atendimento', async ({ request }) => {
    // 1. Cadastrar Cliente
    const custRes = await request.post('/customers', {
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-tenant-slug': slug,
      },
      data: {
        name: 'Marcelo Oliveira',
        phone: '11999998888',
        email: 'marcelo@cliente.com',
      },
    });
    expect(custRes.status()).toBe(201);
    customerId = (await custRes.json()).id;

    // 2. Cadastrar Veículo
    const vehRes = await request.post('/vehicles', {
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-tenant-slug': slug,
      },
      data: {
        customerId,
        plate: `CAR${Math.floor(1000 + Math.random() * 9000)}`,
        brand: 'Honda',
        model: 'Civic Touring 1.5 Turbo',
        year: 2024,
        color: 'Preto Cristal',
      },
    });
    expect(vehRes.status()).toBe(201);
    vehicleId = (await vehRes.json()).id;

    // 3. Cadastrar Box (Bay) na oficina
    const bayRes = await request.post('/bays', {
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-tenant-slug': slug,
      },
      data: {
        name: 'Box 01 — Estética & Detalhamento',
        type: 'detailing',
      },
    });
    expect(bayRes.status()).toBe(201);
    bayId = (await bayRes.json()).id;
  });

  test('03. Criação de Orçamento (QUOTE) com Numeração Sequencial Atômica', async ({ request }) => {
    const osRes = await request.post('/work-orders', {
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-tenant-slug': slug,
      },
      data: {
        customerId,
        vehicleId,
        technicianId: techUserId,
        status: 'QUOTE',
        notes: 'Cliente solicitou orçamento de PPF Frontal e Vitrificação',
        items: [
          { name: 'PPF Frontal Completo', unitPriceCents: 250000, quantity: 1 },
          { name: 'Vitrificação Cerâmica 9H', unitPriceCents: 120000, quantity: 1 },
        ],
      },
    });
    expect(osRes.status()).toBe(201);
    const os = await osRes.json();
    workOrderId = os.id;
    trackingToken = os.trackingToken;

    expect(os.status).toBe('QUOTE');
    expect(os.osNumber).toBeGreaterThan(0);
    expect(os.totalCents).toBe(370000); // R$ 3.700,00
  });

  test('04. Aprovação do Orçamento (APPROVED)', async ({ request }) => {
    const res = await request.patch(`/work-orders/${workOrderId}/status`, {
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-tenant-slug': slug,
      },
      data: {
        status: 'APPROVED',
        notes: 'Cliente aprovou o orçamento presencialmente',
      },
    });
    expect(res.status()).toBe(200);
    const updated = await res.json();
    expect(updated.status).toBe('APPROVED');
    expect(updated.progress).toBe(10);
  });

  test('05. Agendamento com Alocação de Box (SCHEDULED)', async ({ request }) => {
    // 1. Criar agendamento formal no Box 01
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const apptRes = await request.post('/appointments', {
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-tenant-slug': slug,
      },
      data: {
        bayId,
        customerId,
        workOrderId,
        title: 'PPF Frontal e Vitrificação',
        startTime: `${tomorrow}T09:00:00Z`,
        endTime: `${tomorrow}T12:00:00Z`,
      },
    });
    expect(apptRes.status()).toBe(201);

    // 2. Transicionar OS para SCHEDULED
    const statusRes = await request.patch(`/work-orders/${workOrderId}/status`, {
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-tenant-slug': slug,
      },
      data: {
        status: 'SCHEDULED',
        notes: 'Agendado no Box 01 para amanhã às 09:00',
      },
    });
    expect(statusRes.status()).toBe(200);
    expect((await statusRes.json()).status).toBe('SCHEDULED');
  });

  test('06. Checklist de Entrada / VCR (CHECKED_IN)', async ({ request }) => {
    // 1. Criar inspeção com nível de combustível e avarias prévias
    const inspRes = await request.post('/inspections', {
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-tenant-slug': slug,
      },
      data: {
        workOrderId,
        vehicleId,
        fuelLevel: '3/4',
        currentKm: 15420,
        notes: 'Pequeno risco prévio no para-choque dianteiro direito (documentado)',
        checklistItems: [
          { id: 'item-1', label: 'Pneus e Rodas', checked: true },
          { id: 'item-2', label: 'Faróis e Lanternas', checked: true },
        ],
      },
    });
    expect(inspRes.status()).toBe(201);

    // 2. Mudar status para CHECKED_IN
    const statusRes = await request.patch(`/work-orders/${workOrderId}/status`, {
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-tenant-slug': slug,
      },
      data: {
        status: 'CHECKED_IN',
        notes: 'Veículo deu entrada e inspeção fotográfica concluída',
      },
    });
    expect(statusRes.status()).toBe(200);
    expect((await statusRes.json()).status).toBe('CHECKED_IN');
  });

  test('07. Execução Técnica e Cronômetro Oficial (IN_PROGRESS)', async ({ request }) => {
    // 1. Técnico inicia a OS e o cronômetro oficial
    const startRes = await request.post(`/technician/work-orders/${workOrderId}/start`, {
      headers: {
        authorization: `Bearer ${techToken}`,
        'x-tenant-slug': slug,
      },
    });
    expect(startRes.status()).toBe(200);

    // 2. Parar cronômetro oficial ao finalizar
    const stopRes = await request.post(`/technician/work-orders/${workOrderId}/stop`, {
      headers: {
        authorization: `Bearer ${techToken}`,
        'x-tenant-slug': slug,
      },
      data: {
        notes: 'Aplicação de PPF concluída em tempo recorde',
      },
    });
    expect(stopRes.status()).toBe(200);
  });

  test('08. Controle de Qualidade (QA -> READY)', async ({ request }) => {
    // 1. Técnico envia para QA
    const qaPendingRes = await request.patch(`/work-orders/${workOrderId}/status`, {
      headers: {
        authorization: `Bearer ${techToken}`,
        'x-tenant-slug': slug,
      },
      data: {
        status: 'QA',
        notes: 'Serviço finalizado, aguardando validação do líder técnico',
      },
    });
    expect(qaPendingRes.status()).toBe(200);
    expect((await qaPendingRes.json()).status).toBe('QA');

    // 2. Gestor audita os critérios de qualidade e aprova
    const qaAuditRes = await request.post('/qa/audits', {
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-tenant-slug': slug,
      },
      data: {
        workOrderId,
        status: 'approved',
        score: 5,
        checklistItems: [
          { id: 'qa-1', label: 'Ausência de bolhas no PPF', passed: true },
          { id: 'qa-2', label: 'Cura da vitrificação uniforme', passed: true },
          { id: 'qa-3', label: 'Limpeza interna e acabamento', passed: true },
        ],
        notes: 'Qualidade excepcional aprovada',
      },
    });
    expect(qaAuditRes.status()).toBe(201);

    // 3. Transicionar OS para READY (pronto para entrega)
    const qaApprovedRes = await request.patch(`/work-orders/${workOrderId}/status`, {
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-tenant-slug': slug,
      },
      data: {
        status: 'READY',
        notes: 'Aprovado no controle de qualidade e pronto para entrega',
      },
    });
    expect(qaApprovedRes.status()).toBe(200);
    expect((await qaApprovedRes.json()).status).toBe('READY');
  });

  test('09. Pagamento e Liquidação Financeira Atômica', async ({ request }) => {
    // Registrar pagamento total via PIX com conciliação
    const payRes = await request.post(`/work-orders/${workOrderId}/payments`, {
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-tenant-slug': slug,
      },
      data: {
        amountCents: 370000, // R$ 3.700,00
        method: 'pix',
        notes: 'Pagamento total recebido via Pix',
      },
    });
    expect(payRes.status()).toBe(201);
    const payData = await payRes.json();
    expect(payData.status).toBe('approved');
  });

  test('10. Entrega do Veículo (DELIVERED)', async ({ request }) => {
    const res = await request.patch(`/work-orders/${workOrderId}/status`, {
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-tenant-slug': slug,
      },
      data: {
        status: 'DELIVERED',
        notes: 'Veículo entregue ao cliente com chave em mãos',
      },
    });
    expect(res.status()).toBe(200);
    const delivered = await res.json();
    expect(delivered.status).toBe('DELIVERED');
    expect(delivered.progress).toBe(100);
  });

  test('11. Passaporte Digital do Veículo e Garantia', async ({ request }) => {
    // 1. Emitir Certificado de Garantia oficial
    const warrantyRes = await request.post('/warranties', {
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-tenant-slug': slug,
      },
      data: {
        workOrderId,
        serviceName: 'PPF Frontal e Vitrificação',
        warrantyMonths: 12,
        coverageDetails: 'Garantia total contra descolamento ou amarelamento',
      },
    });
    expect(warrantyRes.status()).toBe(201);
    const warranty = await warrantyRes.json();
    expect(warranty.workOrderId).toBe(workOrderId);
    expect(warranty.verificationToken).toBeDefined();

    // 2. Consulta pública de verificação do passaporte via QR Code
    const passportRes = await request.get(`/public/passports/${warranty.verificationToken}`);
    expect(passportRes.status()).toBe(200);
    const passport = await passportRes.json();
    expect(passport.isValid).toBe(true);
    expect(passport.serviceName).toContain('PPF');
  });

  test('12. Pesquisa NPS e Avaliação Pós-Venda', async ({ request }) => {
    // 1. Gestor dispara pesquisa NPS pós-entrega
    const npsCreateRes = await request.post('/nps/surveys', {
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-tenant-slug': slug,
      },
      data: {
        workOrderId,
      },
    });
    expect(npsCreateRes.status()).toBe(201);
    const survey = await npsCreateRes.json();
    expect(survey.token).toBeDefined();

    // 2. Cliente responde link público pelo celular (sem token JWT)
    const npsAnswerRes = await request.post(`/public/nps/${survey.token}`, {
      data: {
        score: 10,
        comment: 'Serviço impecável! O PPF ficou invisível e o atendimento foi excelente.',
      },
    });
    expect(npsAnswerRes.status()).toBe(200);
    const answerResult = await npsAnswerRes.json();
    expect(answerResult.isPromoter).toBe(true);
    expect(answerResult.survey.score).toBe(10);
    expect(answerResult.survey.classification).toBe('promoter');
  });

  test('13. Rastreamento Público da OS (Tracking sem Token JWT)', async ({ request }) => {
    const trackRes = await request.get(`/work-orders/tracking/${trackingToken}`);
    expect(trackRes.status()).toBe(200);
    const tracking = await trackRes.json();
    expect(tracking.status).toBe('DELIVERED');
    expect(tracking.progress).toBe(100);
    expect(tracking.brand).toBe('Honda');
  });
});

