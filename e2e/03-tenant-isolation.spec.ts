import { test, expect } from '@playwright/test';

test.describe.serial('T3.16 — E2E: Isolamento Estrito Multi-Tenant e RLS (Oficina Alpha vs Oficina Beta)', () => {
  const timestamp = Date.now();
  let slugAlpha = `oficina-alpha-${timestamp}`;
  let slugBeta = `oficina-beta-${timestamp}`;
  const ownerAlphaEmail = `owner-alpha-${timestamp}@oficina-alpha.com`;
  const ownerBetaEmail = `owner-beta-${timestamp}@oficina-beta.com`;
  const password = 'Senha@CarX2026!';

  let tokenAlpha: string;
  let tokenBeta: string;

  let customerAlphaId: string;
  let vehicleAlphaId: string;
  let bayAlphaId: string;
  let serviceAlphaId: string;
  let workOrderAlphaId: string;

  let customerBetaId: string;
  let vehicleBetaId: string;
  let bayBetaId: string;

  test.beforeAll(async ({ request }) => {
    // 1. Registro e Onboarding da Oficina Alpha
    const regAlphaRes = await request.post('/auth/register', {
      data: {
        companyName: `Oficina Alpha Auto Center ${timestamp}`,
        tenantSlug: slugAlpha,
        email: ownerAlphaEmail,
        password,
        name: 'Carlos Proprietário Alpha',
      },
    });
    expect(regAlphaRes.status()).toBe(201);
    const regAlphaData = await regAlphaRes.json();
    slugAlpha = regAlphaData.membership.tenant_slug;

    const loginAlphaRes = await request.post('/auth/login', {
      data: { email: ownerAlphaEmail, password, tenantSlug: slugAlpha },
    });
    expect(loginAlphaRes.status()).toBe(200);
    tokenAlpha = (await loginAlphaRes.json()).tokens.accessToken;

    // 2. Registro e Onboarding da Oficina Beta
    const regBetaRes = await request.post('/auth/register', {
      data: {
        companyName: `Oficina Beta Performance ${timestamp}`,
        tenantSlug: slugBeta,
        email: ownerBetaEmail,
        password,
        name: 'Bruno Proprietário Beta',
      },
    });
    expect(regBetaRes.status()).toBe(201);
    const regBetaData = await regBetaRes.json();
    slugBeta = regBetaData.membership.tenant_slug;

    const loginBetaRes = await request.post('/auth/login', {
      data: { email: ownerBetaEmail, password, tenantSlug: slugBeta },
    });
    expect(loginBetaRes.status()).toBe(200);
    tokenBeta = (await loginBetaRes.json()).tokens.accessToken;

    // 3. Setup de recursos na Oficina Alpha
    // Cliente Alpha
    const custAlphaRes = await request.post('/customers', {
      headers: { authorization: `Bearer ${tokenAlpha}`, 'x-tenant-slug': slugAlpha },
      data: {
        name: 'Roberto Cliente Alpha VIP',
        phone: '11911112222',
        email: 'roberto@alpha-client.com',
      },
    });
    expect(custAlphaRes.status()).toBe(201);
    customerAlphaId = (await custAlphaRes.json()).id;

    // Veículo Alpha
    const vehAlphaRes = await request.post('/vehicles', {
      headers: { authorization: `Bearer ${tokenAlpha}`, 'x-tenant-slug': slugAlpha },
      data: {
        customer_id: customerAlphaId,
        plate: 'ALP1A11',
        brand: 'Porsche',
        model: '911 Carrera GTS',
        year: 2024,
      },
    });
    expect(vehAlphaRes.status()).toBe(201);
    vehicleAlphaId = (await vehAlphaRes.json()).id;

    // Box Alpha
    const bayAlphaRes = await request.post('/bays', {
      headers: { authorization: `Bearer ${tokenAlpha}`, 'x-tenant-slug': slugAlpha },
      data: {
        name: 'Box Alpha Pintura Especial',
        color: '#E11D48',
      },
    });
    expect(bayAlphaRes.status()).toBe(201);
    bayAlphaId = (await bayAlphaRes.json()).id;

    // Serviço Alpha
    const srvAlphaRes = await request.post('/catalog/services', {
      headers: { authorization: `Bearer ${tokenAlpha}`, 'x-tenant-slug': slugAlpha },
      data: {
        name: 'PPF Full Frontal Alpha',
        category: 'ESTETICA',
        priceCents: 800000,
        price_cents: 800000,
        estimatedMinutes: 360,
        estimated_minutes: 360,
      },
    });
    expect(srvAlphaRes.status()).toBe(201);
    serviceAlphaId = (await srvAlphaRes.json()).id;

    // Work Order Alpha
    const woAlphaRes = await request.post('/work-orders', {
      headers: { authorization: `Bearer ${tokenAlpha}`, 'x-tenant-slug': slugAlpha },
      data: {
        customerId: customerAlphaId,
        vehicleId: vehicleAlphaId,
        notes: 'Serviço confidencial Alpha',
      },
    });
    expect(woAlphaRes.status()).toBe(201);
    workOrderAlphaId = (await woAlphaRes.json()).id;

    // 4. Setup de recursos na Oficina Beta
    // Cliente Beta
    const custBetaRes = await request.post('/customers', {
      headers: { authorization: `Bearer ${tokenBeta}`, 'x-tenant-slug': slugBeta },
      data: {
        name: 'Tiago Cliente Beta VIP',
        phone: '11955556666',
        email: 'tiago@beta-client.com',
      },
    });
    expect(custBetaRes.status()).toBe(201);
    customerBetaId = (await custBetaRes.json()).id;

    // Veículo Beta
    const vehBetaRes = await request.post('/vehicles', {
      headers: { authorization: `Bearer ${tokenBeta}`, 'x-tenant-slug': slugBeta },
      data: {
        customer_id: customerBetaId,
        plate: 'BET2B22',
        brand: 'BMW',
        model: 'M3 Competition',
        year: 2024,
      },
    });
    expect(vehBetaRes.status()).toBe(201);
    vehicleBetaId = (await vehBetaRes.json()).id;

    // Box Beta
    const bayBetaRes = await request.post('/bays', {
      headers: { authorization: `Bearer ${tokenBeta}`, 'x-tenant-slug': slugBeta },
      data: {
        name: 'Box Beta Mecânica Pesada',
        color: '#2563EB',
      },
    });
    expect(bayBetaRes.status()).toBe(201);
    bayBetaId = (await bayBetaRes.json()).id;
  });

  test('01. Listagem de Clientes: Beta enxerga apenas seus clientes, sem vazamento dos dados de Alpha', async ({ request }) => {
    const listRes = await request.get('/customers', {
      headers: { authorization: `Bearer ${tokenBeta}`, 'x-tenant-slug': slugBeta },
    });
    expect(listRes.status()).toBe(200);
    const data = await listRes.json();
    const customers = Array.isArray(data) ? data : data.data || data.customers || [];

    const hasBetaCustomer = customers.some((c: any) => c.id === customerBetaId);
    const hasAlphaCustomer = customers.some((c: any) => c.id === customerAlphaId);

    expect(hasBetaCustomer).toBe(true);
    expect(hasAlphaCustomer).toBe(false);
  });

  test('02. Busca Direta Cross-Tenant de Cliente: Beta recebe 404 ao tentar acessar Cliente de Alpha', async ({ request }) => {
    const getRes = await request.get(`/customers/${customerAlphaId}`, {
      headers: { authorization: `Bearer ${tokenBeta}`, 'x-tenant-slug': slugBeta },
    });
    expect(getRes.status()).toBe(404);
  });

  test('03. Busca Direta Cross-Tenant de Veículo: Beta recebe 404 ao tentar acessar Veículo de Alpha', async ({ request }) => {
    const getRes = await request.get(`/vehicles/${vehicleAlphaId}`, {
      headers: { authorization: `Bearer ${tokenBeta}`, 'x-tenant-slug': slugBeta },
    });
    expect(getRes.status()).toBe(404);
  });

  test('04. Boxes de Atendimento: Beta enxerga apenas seus boxes e recebe 404 ao buscar box de Alpha', async ({ request }) => {
    // Listagem
    const listRes = await request.get('/bays', {
      headers: { authorization: `Bearer ${tokenBeta}`, 'x-tenant-slug': slugBeta },
    });
    expect(listRes.status()).toBe(200);
    const bays = await listRes.json();
    expect(bays.some((b: any) => b.id === bayBetaId)).toBe(true);
    expect(bays.some((b: any) => b.id === bayAlphaId)).toBe(false);

    // Consulta direta
    const getRes = await request.get(`/bays/${bayAlphaId}`, {
      headers: { authorization: `Bearer ${tokenBeta}`, 'x-tenant-slug': slugBeta },
    });
    expect(getRes.status()).toBe(404);
  });

  test('05. Ordens de Serviço: Beta recebe 404 ao tentar consultar ou alterar OS de Alpha', async ({ request }) => {
    // Consulta direta de OS pertencente a Alpha
    const getRes = await request.get(`/work-orders/${workOrderAlphaId}`, {
      headers: { authorization: `Bearer ${tokenBeta}`, 'x-tenant-slug': slugBeta },
    });
    expect(getRes.status()).toBe(404);

    // Tentativa de mutação indevida de OS de Alpha por usuário de Beta
    const mutateRes = await request.put(`/work-orders/${workOrderAlphaId}`, {
      headers: { authorization: `Bearer ${tokenBeta}`, 'x-tenant-slug': slugBeta },
      data: {
        notes: 'Injeção de anotações não autorizadas por concorrente',
      },
    });
    expect(mutateRes.status()).toBe(404);
  });

  test('06. Mutação Cruzada de Clientes: Beta recebe 404 ao tentar editar cliente de Alpha', async ({ request }) => {
    const updateRes = await request.put(`/customers/${customerAlphaId}`, {
      headers: { authorization: `Bearer ${tokenBeta}`, 'x-tenant-slug': slugBeta },
      data: {
        name: 'Tentativa de sequestro de dados cadastrais',
      },
    });
    expect(updateRes.status()).toBe(404);
  });

  test('07. Simetria de Isolamento: Alpha recebe 404 ao tentar acessar recursos de Beta', async ({ request }) => {
    // Alpha tenta acessar cliente de Beta
    const custRes = await request.get(`/customers/${customerBetaId}`, {
      headers: { authorization: `Bearer ${tokenAlpha}`, 'x-tenant-slug': slugAlpha },
    });
    expect(custRes.status()).toBe(404);

    // Alpha tenta acessar veículo de Beta
    const vehRes = await request.get(`/vehicles/${vehicleBetaId}`, {
      headers: { authorization: `Bearer ${tokenAlpha}`, 'x-tenant-slug': slugAlpha },
    });
    expect(vehRes.status()).toBe(404);

    // Alpha tenta acessar box de Beta
    const bayRes = await request.get(`/bays/${bayBetaId}`, {
      headers: { authorization: `Bearer ${tokenAlpha}`, 'x-tenant-slug': slugAlpha },
    });
    expect(bayRes.status()).toBe(404);
  });

  test('08. Tenant Inexistente: Cabeçalho com slug inválido é rejeitado com 404', async ({ request }) => {
    const res = await request.get('/customers', {
      headers: {
        authorization: `Bearer ${tokenAlpha}`,
        'x-tenant-slug': 'slug-oficina-inexistente-12345',
      },
    });
    // Se a oficina não for encontrada na resolução do slug, o contexto falha com 404 ou 400
    expect([400, 403, 404]).toContain(res.status());
  });
});

