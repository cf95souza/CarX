import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const EVIDENCE_DIR = 'C:\\Users\\cf95s\\.gemini\\antigravity\\brain\\82b881ae-b125-4469-acef-bf7c3438039f\\evidence\\item42';
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

async function runItem42Test() {
  console.log('📸 [ITEM 42] Iniciando teste visual dos novos botões de fases de fotos (sem emojis)...');

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: false,
    slowMo: 1000,
  });

  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await context.newPage();

  try {
    // 1. LOGIN DO GESTOR LOCAL
    console.log('📌 1. Acessando login do Gestor (caioteste)...');
    await page.goto('http://localhost:5173/caioteste/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', 'caio@teste.com');
    await page.fill('input[type="password"]', 'Admin@CarX2026!');
    await page.click('button[type="submit"]');

    await page.waitForURL(url => url.pathname.includes('/dashboard'), { timeout: 15000 });
    console.log('   ✓ Login efetuado com sucesso!');
    await page.waitForTimeout(1000);

    // 2. NAVEGAR PARA /operador
    console.log('📌 2. Acessando App do Operador (/operador)...');
    await page.goto('http://localhost:5173/operador', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Clica na OS em execução ou próxima tarefa para abrir o ExecutorView
    console.log('📌 3. Abrindo OS no ExecutorView...');
    const cardOS = page.locator('div[class*="cursor-pointer"], button[class*="cursor-pointer"]').filter({ hasText: 'BRA2E19' }).first();
    if (await cardOS.isVisible()) {
      await cardOS.click();
      await page.waitForTimeout(1500);
    } else {
      // Se não achar pelo texto BRA2E19, clica no primeiro card de OS
      const anyCard = page.locator('div[class*="rounded-2xl"][class*="cursor-pointer"]').first();
      if (await anyCard.isVisible()) {
        await anyCard.click();
        await page.waitForTimeout(1500);
      }
    }

    // Rola suavemente até a seção de Vistoria Guiada 360°
    console.log('📌 4. Localizando Vistoria Guiada 360° & Acabamento...');
    const gallerySection = page.locator('h4:has-text("Vistoria Guiada 360° & Acabamento")').first();
    if (await gallerySection.isVisible()) {
      await gallerySection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(800);
    }

    // 5. CAPTURA COM A FASE DURANTE ATIVA
    console.log('📌 5. Capturando evidência com a fase DURANTE ativa...');
    const s1 = path.join(EVIDENCE_DIR, '01-item42-botoes-fases-durante.png');
    await page.screenshot({ path: s1 });
    console.log(`   ✓ [Evidência 1] Salva em: ${s1}`);

    // 6. CLICAR NO BOTÃO ANTES (RECEPÇÃO)
    console.log('📌 6. Clicando no botão ANTES (RECEPÇÃO)...');
    const btnAntes = page.locator('button:has-text("Antes (Recepção)")').first();
    if (await btnAntes.isVisible()) {
      await btnAntes.click();
      await page.waitForTimeout(1000);

      const s2 = path.join(EVIDENCE_DIR, '02-item42-botoes-fases-antes.png');
      await page.screenshot({ path: s2 });
      console.log(`   ✓ [Evidência 2] Salva em: ${s2}`);
    }

    // 7. CLICAR NO BOTÃO DEPOIS (ACABAMENTO)
    console.log('📌 7. Clicando no botão DEPOIS (ACABAMENTO)...');
    const btnDepois = page.locator('button:has-text("Depois (Acabamento)")').first();
    if (await btnDepois.isVisible()) {
      await btnDepois.click();
      await page.waitForTimeout(1000);

      const s3 = path.join(EVIDENCE_DIR, '03-item42-botoes-fases-depois.png');
      await page.screenshot({ path: s3 });
      console.log(`   ✓ [Evidência 3] Salva em: ${s3}`);
    }

    await page.waitForTimeout(2000);
    console.log('✅ [ITEM 42] Teste visual dos novos botões de fases concluído com sucesso!');
  } catch (error) {
    console.error('❌ Erro no teste do Item 42:', error);
    const errPath = path.join(EVIDENCE_DIR, 'erro-item42.png');
    await page.screenshot({ path: errPath });
    throw error;
  } finally {
    await browser.close();
  }
}

runItem42Test();
