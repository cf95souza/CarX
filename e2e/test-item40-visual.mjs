import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const EVIDENCE_DIR = 'C:\\Users\\cf95s\\.gemini\\antigravity\\brain\\82b881ae-b125-4469-acef-bf7c3438039f\\evidence\\item40';
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

async function runItem40Test() {
  console.log('📊 [ITEM 40] Iniciando teste visual de progresso inicial da OS (0% em Agendado/Aprovado)...');

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: false,
    slowMo: 1000,
  });

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    // 1. LOGIN NA VPS OU LOCAL
    console.log('📌 1. Acessando login do Gestor na VPS de teste (caiocar)...');
    await page.goto('http://137.131.151.125:8080/caiocar/login', { waitUntil: 'networkidle', timeout: 30000 });
    await page.fill('input[type="email"]', 'caiocar@carx.com');
    await page.fill('input[type="password"]', 'caio@testeA1');
    await page.click('button[type="submit"]');

    await page.waitForURL(url => url.pathname.includes('/dashboard'), { timeout: 15000 });
    console.log('   ✓ Login efetuado com sucesso na VPS!');
    await page.waitForTimeout(1000);

    // 2. NAVEGAR PARA /ordens
    console.log('📌 2. Acessando tela de Ordens de Serviço (/ordens)...');
    await page.goto('http://137.131.151.125:8080/ordens', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // 3. CAPTURAR A TELA DAS ORDENS DE SERVIÇO (Print 2 com progresso em 0%)
    console.log('📌 3. Capturando evidência visual da tabela de Ordens de Serviço com progresso em 0%...');
    const s1 = path.join(EVIDENCE_DIR, '01-item40-ordens-progresso-0.png');
    await page.screenshot({ path: s1, fullPage: false });
    console.log(`   ✓ [Evidência 1] Salva em: ${s1}`);

    await page.waitForTimeout(3000);
    console.log('✅ [ITEM 40] Teste visual concluído com sucesso!');
  } catch (error) {
    console.error('❌ Erro no teste do Item 40:', error);
    const errPath = path.join(EVIDENCE_DIR, 'erro-item40.png');
    await page.screenshot({ path: errPath });
    throw error;
  } finally {
    await browser.close();
  }
}

runItem40Test();
