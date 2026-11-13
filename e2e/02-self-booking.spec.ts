import { test, expect } from '@playwright/test';

test.describe.serial('T3.16 — E2E: Agendamento Online Público e Proteção Anti-Bot', () => {
  const timestamp = Date.now();
  let slug = `oficina-online-${timestamp}`;
  const ownerEmail = `proprietario-${timestamp}@onlineauto.com`;
  const ownerPassword = 'Senha@CarX2026!';

  let ownerToken: string;
  let serviceId: string;
  let defaultBayId: string;
  let createdWorkOrderId: string;
  let trackingToken: string;

  test.beforeAll(async ({ request }) => {
    // 1. Criar oficina de teste via onboarding
    const regRes = await request.post('/auth/register', {
      data: {
        companyName: `Oficina Agendamento Online ${timestamp}`,
        tenantSlug: `oficina-online-${timestamp}`,
        email: ownerEmail,
        password: ownerPassword,
        name: 'Gestor Portal Online',
      },
    });
    expect(regRes.status()).toBe(201);
    const regData = await regRes.json();
    slug = regData.membership.tenant_slug;

    // Login do Gestor da Oficina para obter o token JWT
    const loginRes = await request.post('/auth/login', {
      data: {
        email: ownerEmail,
        password: ownerPassword,
        tenantSlug: slug,
      },
    });
    expect(loginRes.status()).toBe(200);
    const loginData = await loginRes.json();
    ownerToken = loginData.tokens.accessToken;

    // 2. Criar Box de Atendimento para a Oficina
    const bayRes = await request.post('/bays', {
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-tenant-slug': slug,
      },
      data: {
        name: 'Box Rápido 1',
        description: 'Box para serviços rápidos e inspeção online',
        color: '#10B981',
      },
    });
    if (bayRes.status() !== 201) {
      console.log('BAY ERROR:', bayRes.status(), await bayRes.text());
    }
    expect(bayRes.status()).toBe(201);
    defaultBayId = (await bayRes.json()).id;

    // 3. Cadastrar Serviço no Catálogo da Oficina
    const serviceRes = await request.post('/catalog/services', {
      headers: {
        authorization: `Bearer ${ownerToken}`,
        'x-tenant-slug': slug,
      },
      data: {
        name: 'Polimento Técnico Premium',
        category: 'ESTETICA',
        priceCents: 35000,
        price_cents: 35000,
        estimatedMinutes: 120,
        estimated_minutes: 120,
        warrantyMonths: 6,
        description: 'Polimento com selante sintético de alto brilho',
      },
    });
    expect(serviceRes.status()).toBe(201);
    serviceId = (await serviceRes.json()).id;
  });

  test('01. Honeypot Anti-Bot: Deve bloquear requisições com campo armadilha preenchido', async ({ request }) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    tomorrow.setHours(10, 0, 0, 0);

    // Tentativa de ataque/spam de robô com campo "website" (honeypot) preenchido
    const botRes = await request.post(`/public/book/${slug}`, {
      data: {
        customerName: 'Spam Bot Script',
        customerPhone: '11999990000',
        customerEmail: 'bot@spamnetwork.com',
        vehiclePlate: 'SPM1B23',
        vehicleModel: 'Robo 2.0',
        vehicleSizeClass: 'sedan',
        serviceIds: [serviceId],
        preferredStartTime: tomorrow.toISOString(),
        website: 'https://viagra-pills-spam.com/promo', // Honeypot ativado!
      },
    });

    expect(botRes.status()).toBe(400);
    const botData = await botRes.json();
    expect(botData.message).toContain('anti-bot');
  });

  test('02. Agendamento Público Legítimo: Deve criar cliente, veículo, OS no status QUOTE/ONLINE e alocar box', async ({ request }) => {
    const bookingTime = new Date();
    bookingTime.setDate(bookingTime.getDate() + 3);
    bookingTime.setHours(14, 0, 0, 0);

    const bookingRes = await request.post(`/public/book/${slug}`, {
      data: {
        customerName: 'Fernanda Martins',
        customerPhone: '11988887777',
        customerEmail: 'fernanda@gmail.com',
        vehiclePlate: 'BRA2E19',
        vehicleBrand: 'Toyota',
        vehicleModel: 'Corolla Altis Hybrid',
        vehicleSizeClass: 'sedan',
        serviceIds: [serviceId],
        preferredStartTime: bookingTime.toISOString(),
        notes: 'Cliente solicitou atenção especial aos faróis.',
        website: '', // Honeypot vazio (humano legítimo)
      },
    });

    expect(bookingRes.status()).toBe(201);
    const data = await bookingRes.json();
    console.log('BOOKING DATA:', JSON.stringify(data, null, 2));

    expect(data.workOrder).toBeDefined();

    // Critérios estritos de segurança do Agendamento Público:
    // 1. Status obrigatório: QUOTE (Orçamento - nunca aberto ou aprovado direto)
    expect(data.workOrder.status).toBe('QUOTE');
    // 2. Origem obrigatória: ONLINE
    expect(data.workOrder.origin).toBe('ONLINE');
    // 3. Técnico nulo (não aloca técnico automaticamente no agendamento público)
    expect(data.workOrder.technicianId).toBeFalsy();
    // 4. Token de acompanhamento gerado
    expect(typeof data.workOrder.trackingToken).toBe('string');
    expect(data.workOrder.trackingToken.length).toBeGreaterThan(10);
    // 5. Agendamento criado e vinculado ao Box
    expect(data.appointment).toBeDefined();
    expect(data.appointment.bayId).toBe(defaultBayId);

    createdWorkOrderId = data.workOrder.id;
    trackingToken = data.workOrder.trackingToken;
  });

  test('03. Prevenção de Conflito de Horário: Deve rejeitar agendamento sobreposto no mesmo Box', async ({ request }) => {
    const overlappingTime = new Date();
    overlappingTime.setDate(overlappingTime.getDate() + 3);
    overlappingTime.setHours(14, 30, 0, 0); // Conflita com o agendamento anterior das 14:00 às 16:00

    const conflictRes = await request.post(`/public/book/${slug}`, {
      data: {
        customerName: 'Outro Cliente Conflitante',
        customerPhone: '11977776666',
        vehiclePlate: 'CFX9E88',
        vehicleBrand: 'Honda',
        vehicleModel: 'Civic',
        vehicleSizeClass: 'sedan',
        serviceIds: [serviceId],
        bayId: defaultBayId,
        preferredStartTime: overlappingTime.toISOString(),
        website: '',
      },
    });

    // Deve retornar 409 (Conflict) informando indisponibilidade de box
    expect(conflictRes.status()).toBe(409);
    const conflictData = await conflictRes.json();
    expect(conflictData.message).toMatch(/Choque de horário|ocupados/i);
  });

  test('04. Validação de Integridade: Rejeita placa de veículo inválida', async ({ request }) => {
    const invalidTime = new Date();
    invalidTime.setDate(invalidTime.getDate() + 4);
    invalidTime.setHours(9, 0, 0, 0);

    const invalidPlateRes = await request.post(`/public/book/${slug}`, {
      data: {
        customerName: 'Cliente Placa Inválida',
        customerPhone: '11999991111',
        vehiclePlate: 'PLACA-ERRADA',
        vehicleModel: 'Carro',
        serviceIds: [serviceId],
        preferredStartTime: invalidTime.toISOString(),
      },
    });

    expect(invalidPlateRes.status()).toBe(400);
    const errData = await invalidPlateRes.json();
    expect(errData.message).toContain('Placa');
  });

  test('05. Validação de Tenant: Rejeita agendamento para oficina inexistente', async ({ request }) => {
    const futureTime = new Date();
    futureTime.setDate(futureTime.getDate() + 5);

    const ghostTenantRes = await request.post('/public/book/oficina-fantasma-inexistente-xyz', {
      data: {
        customerName: 'Cliente Teste',
        customerPhone: '11999992222',
        vehiclePlate: 'XYZ1A23',
        vehicleModel: 'Fiat Uno',
        serviceIds: [serviceId],
        preferredStartTime: futureTime.toISOString(),
      },
    });

    expect(ghostTenantRes.status()).toBe(404);
  });

  test('06. Tracking Público: Consulta pública da OS agendada pelo token sem autenticação', async ({ request }) => {
    expect(trackingToken).toBeDefined();

    const trackRes = await request.get(`/work-orders/tracking/${trackingToken}`);
    expect(trackRes.status()).toBe(200);

    const trackData = await trackRes.json();
    expect(trackData.status).toBe('QUOTE');
    expect(trackData.plate).toBe('BRA2E19');
    expect(trackData.model).toContain('Corolla');
    expect(trackData.osNumber).toBeGreaterThanOrEqual(1);
  });
});

