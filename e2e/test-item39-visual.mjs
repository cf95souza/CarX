import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const EVIDENCE_DIR = 'C:\\Users\\cf95s\\.gemini\\antigravity\\brain\\82b881ae-b125-4469-acef-bf7c3438039f\\evidence\\item39';
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

async function runItem39Test() {
  console.log('🚗 [ITEM 39] Iniciando teste visual de digitação de placa livre (sem preenchimento fake)...');

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: false,
    slowMo: 1000,
  });

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    // 1. LOGIN DO GESTOR
    console.log('📌 1. Acessando login da oficina...');
    await page.goto('http://localhost:5173/caioteste/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', 'caio@teste.com');
    await page.fill('input[type="password"]', 'Admin@CarX2026!');
    await page.click('button[type="submit"]');

    await page.waitForURL(url => url.pathname.includes('/dashboard'), { timeout: 15000 });
    console.log('   ✓ Login efetuado com sucesso!');
    await page.waitForTimeout(1000);

    // 2. TELA DE NOVA ORDEM DE SERVIÇO (/ordens/nova)
    console.log('📌 2. Acessando Nova Ordem de Serviço...');
    await page.goto('http://localhost:5173/ordens/nova', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // 3. DIGITAR A PLACA EVH0H11 (Que antes trazia Civic Vermelho)
    console.log('📌 3. Digitando a placa EVH0H11...');
    const inputPlaca = page.locator('input[placeholder*="ABC1D23"], input[placeholder*="BRA2E19"], input[placeholder*="Placa"]').first();
    await inputPlaca.fill('EVH0H11');
    await page.waitForTimeout(2000);

    const s1 = path.join(EVIDENCE_DIR, '01-item39-nova-os-placa-limpa.png');
    await page.screenshot({ path: s1 });
    console.log(`   ✓ [Evidência 1] Salva em: ${s1}`);

    // 4. TESTAR NO MODAL DE NOVO ORÇAMENTO EM /vendas
    console.log('📌 4. Navegando para tela de Vendas & Orçamentos...');
    await page.goto('http://localhost:5173/vendas', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const btnNovoOrcamento = page.locator('button:has-text("Novo Orçamento")').first();
    if (await btnNovoOrcamento.isVisible()) {
      await btnNovoOrcamento.click();
      await page.waitForTimeout(1000);

      const modalOrcamento = page.locator('div[class*="fixed inset-0"]').last();
      
      // Selecionar o primeiro cliente existente na lista dentro do modal
      const itemCliente = modalOrcamento.locator('div[class*="cursor-pointer"]').first();
      if (await itemCliente.isVisible()) {
        await itemCliente.click();
        await page.waitForTimeout(800);
      }

      // No passo 2 (Veículo), clica em "Novo Veículo"
      const btnNovoVeiculo = modalOrcamento.locator('button:has-text("Novo Veículo")').first();
      if (await btnNovoVeiculo.isVisible()) {
        await btnNovoVeiculo.click();
        await page.waitForTimeout(800);
      }

      console.log('📌 5. Digitando a placa EVH0H11 no formulário de novo veículo...');
      const inputPlacaModal = modalOrcamento.locator('input[placeholder*="ABC1D23"]').first();
      if (await inputPlacaModal.isVisible()) {
        await inputPlacaModal.fill('EVH0H11');
        await page.waitForTimeout(2000);
      }

      const s2 = path.join(EVIDENCE_DIR, '02-item39-orcamento-placa-livre.png');
      await page.screenshot({ path: s2 });
      console.log(`   ✓ [Evidência 2] Salva em: ${s2}`);
    }

    console.log('🎉 [ITEM 39] Concluído com sucesso!');
    await page.waitForTimeout(4000);
  } catch (error) {
    console.error('❌ Erro no teste visual do Item 39:', error);
    const errScreenshot = path.join(EVIDENCE_DIR, 'erro-item39.png');
    await page.screenshot({ path: errScreenshot });
    throw error;
  } finally {
    await browser.close();
  }
}

runItem39Test().catch(console.error);
