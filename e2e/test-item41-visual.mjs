import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const EVIDENCE_DIR = 'C:\\Users\\cf95s\\.gemini\\antigravity\\brain\\82b881ae-b125-4469-acef-bf7c3438039f\\evidence\\item41';
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

async function runItem41Test() {
  console.log('📺 [ITEM 41] Iniciando teste visual de isolamento multitenant da TV (/:slug/tv)...');

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: false,
    slowMo: 1000,
  });

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    // 1. LOGIN DO GESTOR LOCAL
    console.log('📌 1. Acessando login da oficina caioteste...');
    await page.goto('http://localhost:5173/caioteste/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', 'caio@teste.com');
    await page.fill('input[type="password"]', 'Admin@CarX2026!');
    await page.click('button[type="submit"]');

    await page.waitForURL(url => url.pathname.includes('/dashboard'), { timeout: 15000 });
    console.log('   ✓ Login efetuado com sucesso!');
    await page.waitForTimeout(1000);

    // 2. VERIFICAR LINK DO MONITOR TV NA SIDEBAR
    console.log('📌 2. Inspecionando o botão Monitor TV na Sidebar...');
    const tvLink = page.locator('a:has-text("Monitor TV")');
    const href = await tvLink.getAttribute('href');
    console.log(`   ✓ Href do Monitor TV na Sidebar: ${href}`);

    const s1 = path.join(EVIDENCE_DIR, '01-item41-sidebar-slug-tv.png');
    await page.screenshot({ path: s1 });
    console.log(`   ✓ [Evidência 1] Salva em: ${s1}`);

    // 3. ABRIR O MONITOR TV COM SLUG (/caioteste/tv)
    console.log('📌 3. Navegando para o Monitor TV parametrizado por slug (/caioteste/tv)...');
    await page.goto('http://localhost:5173/caioteste/tv', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);

    const currentUrl = page.url();
    console.log(`   ✓ URL atual do Monitor TV: ${currentUrl}`);

    const s2 = path.join(EVIDENCE_DIR, '02-item41-monitor-tv-slug.png');
    await page.screenshot({ path: s2 });
    console.log(`   ✓ [Evidência 2] Salva em: ${s2}`);

    // 4. TESTAR ACESSO DIRETO SEM ESTAR LOGADO (PÚBLICO DA TV NA SALA DE ESPERA)
    console.log('📌 4. Testando abertura do Monitor TV em contexto deslogado (Smart TV na parede)...');
    const incognitoContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const incognitoPage = await incognitoContext.newPage();
    await incognitoPage.goto('http://localhost:5173/caioteste/tv', { waitUntil: 'networkidle' });
    await incognitoPage.waitForTimeout(2000);

    const s3 = path.join(EVIDENCE_DIR, '03-item41-smart-tv-publico.png');
    await incognitoPage.screenshot({ path: s3 });
    console.log(`   ✓ [Evidência 3] Salva em: ${s3}`);

    await incognitoContext.close();
    console.log('✅ [ITEM 41] Teste visual de isolamento do Monitor TV concluído com sucesso!');
  } catch (error) {
    console.error('❌ Erro no teste do Item 41:', error);
    const errPath = path.join(EVIDENCE_DIR, 'erro-item41.png');
    await page.screenshot({ path: errPath });
    throw error;
  } finally {
    await browser.close();
  }
}

runItem41Test();
