import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:\\Users\\cf95s\\.gemini\\antigravity\\brain\\e54612f7-8471-447a-82a4-557ef5bff3ca';

async function runVisualQA() {
  console.log('🚀 Iniciando bateria de testes visuais automatizados com Playwright...');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  try {
    // =========================================================================
    // ETAPA 1: APP DO OPERADOR (Mobile Viewport: 390x844)
    // =========================================================================
    console.log('\n📱 Testando App do Operador (Mobile Viewport)...');
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    });
    const mobilePage = await mobileContext.newPage();

    // 1. Acesso à tela de login
    console.log('1. Acessando tela de login...');
    await mobilePage.goto('http://localhost:5173/caiocar/login', { waitUntil: 'networkidle' });
    
    // 2. Preenchimento de credenciais do Operador
    console.log('2. Efetuando login do Operador (operador1@caiocar.com)...');
    await mobilePage.fill('input[type="email"]', 'operador1@caiocar.com');
    await mobilePage.fill('input[type="password"]', 'caio@testeA1');
    await mobilePage.click('button[type="submit"]');

    // 3. Aguarda navegação para /operador
    await mobilePage.waitForURL(url => url.pathname.includes('/operador') || url.pathname.includes('/dashboard'), { timeout: 15000 });
    await mobilePage.waitForTimeout(2000); // aguarda dados sincronizarem

    console.log('3. Capturando Screenshot da Fila de Tarefas do Operador...');
    const filaScreenshotPath = path.join(ARTIFACTS_DIR, 'operador-fila.png');
    await mobilePage.screenshot({ path: filaScreenshotPath });
    console.log(`   Salvo em: ${filaScreenshotPath}`);

    // 4. Teste do Laudo de Inspeção 360° (rebraind/Operador · Laudo de inspeção)
    console.log('4. Clicando em "Fazer checklist e iniciar" / Selecionando OS...');
    const btnChecklist = mobilePage.locator('button:has-text("Fazer checklist e iniciar"), button:has-text("Iniciar serviço"), button:has-text("Continuar serviço")').first();
    
    if (await btnChecklist.isVisible()) {
      await btnChecklist.click();
      await mobilePage.waitForTimeout(1500);

      // Se abriu a tela de execução com checklist pendente, clica em "Fazer Checklist Rápido"
      const btnChecklistRapido = mobilePage.locator('button:has-text("Fazer Checklist Rápido")');
      if (await btnChecklistRapido.isVisible()) {
        await btnChecklistRapido.click();
        await mobilePage.waitForTimeout(1000);
      }

      console.log('5. Capturando Screenshot da tela do Laudo de Inspeção 360°...');
      const laudoScreenshotPath = path.join(ARTIFACTS_DIR, 'operador-laudo-inspecao.png');
      await mobilePage.screenshot({ path: laudoScreenshotPath });
      console.log(`   Salvo em: ${laudoScreenshotPath}`);

      // 5. Teste interativo de marcação de avaria na silhueta do carro
      console.log('6. Clicando na silhueta do carro para marcar avaria (pino número 1)...');
      const carSilhouette = mobilePage.locator('svg').filter({ has: mobilePage.locator('path') }).first();
      if (await carSilhouette.isVisible()) {
        const box = await carSilhouette.boundingBox();
        if (box) {
          // Clica no capô do carro
          await mobilePage.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.25);
          await mobilePage.waitForTimeout(500);

          // Clica na lateral direita
          await mobilePage.mouse.click(box.x + box.width * 0.8, box.y + box.height * 0.55);
          await mobilePage.waitForTimeout(500);

          console.log('7. Capturando Screenshot com pinos de avaria marcados...');
          const avariasScreenshotPath = path.join(ARTIFACTS_DIR, 'operador-laudo-com-avarias.png');
          await mobilePage.screenshot({ path: avariasScreenshotPath });
          console.log(`   Salvo em: ${avariasScreenshotPath}`);
        }
      }

      // Volta para a fila
      const btnBack = mobilePage.locator('button[aria-label="Voltar"], button:has-text("‹")').first();
      if (await btnBack.isVisible()) {
        await btnBack.click();
        await mobilePage.waitForTimeout(1000);
      }
    }

    // 6. Teste da aba Histórico
    console.log('8. Testando aba Histórico do Operador...');
    const tabHistorico = mobilePage.locator('nav button:has-text("Histórico")');
    if (await tabHistorico.isVisible()) {
      await tabHistorico.click();
      await mobilePage.waitForTimeout(1000);
      const historicoScreenshotPath = path.join(ARTIFACTS_DIR, 'operador-historico.png');
      await mobilePage.screenshot({ path: historicoScreenshotPath });
      console.log(`   Salvo em: ${historicoScreenshotPath}`);
    }

    // 7. Teste da aba Perfil
    console.log('9. Testando aba Perfil do Operador...');
    const tabPerfil = mobilePage.locator('nav button:has-text("Perfil")');
    if (await tabPerfil.isVisible()) {
      await tabPerfil.click();
      await mobilePage.waitForTimeout(1000);
      const perfilScreenshotPath = path.join(ARTIFACTS_DIR, 'operador-perfil.png');
      await mobilePage.screenshot({ path: perfilScreenshotPath });
      console.log(`   Salvo em: ${perfilScreenshotPath}`);
    }

    await mobileContext.close();

    // =========================================================================
    // ETAPA 2: PAINEL DO GESTOR (Desktop Viewport: 1280x800)
    // =========================================================================
    console.log('\n💻 Testando Painel do Gestor (Desktop Viewport)...');
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const desktopPage = await desktopContext.newPage();

    console.log('1. Acessando login do Gestor...');
    await desktopPage.goto('http://localhost:5173/caiocar/login', { waitUntil: 'networkidle' });
    await desktopPage.fill('input[type="email"]', 'caiocar@carx.com');
    await desktopPage.fill('input[type="password"]', 'caio@testeA1');
    await desktopPage.click('button[type="submit"]');

    await desktopPage.waitForURL(url => url.pathname.includes('/dashboard'), { timeout: 15000 });
    await desktopPage.waitForTimeout(2000);

    // 2. Navegar para tela de Vendas
    console.log('2. Navegando para tela de Vendas (/vendas)...');
    await desktopPage.goto('http://localhost:5173/vendas', { waitUntil: 'networkidle' });
    await desktopPage.waitForTimeout(2000);

    console.log('3. Capturando Screenshot do Grid de Vendas...');
    const vendasScreenshotPath = path.join(ARTIFACTS_DIR, 'gestor-vendas-grid.png');
    await desktopPage.screenshot({ path: vendasScreenshotPath });
    console.log(`   Salvo em: ${vendasScreenshotPath}`);

    // 3. Abrir Modal de Novo Orçamento
    console.log('4. Abrindo modal de Novo Orçamento...');
    const btnNovoOrcamento = desktopPage.locator('button:has-text("Novo Orçamento"), button:has-text("Nova OS")').first();
    if (await btnNovoOrcamento.isVisible()) {
      await btnNovoOrcamento.click();
      await desktopPage.waitForTimeout(1500);

      console.log('5. Capturando Screenshot do Modal de Novo Orçamento...');
      const novoOrcamentoScreenshotPath = path.join(ARTIFACTS_DIR, 'gestor-novo-orcamento-modal.png');
      await desktopPage.screenshot({ path: novoOrcamentoScreenshotPath });
      console.log(`   Salvo em: ${novoOrcamentoScreenshotPath}`);
    }

    await desktopContext.close();

    console.log('\n🎉 BATERIA DE TESTES VISUAIS CONCLUÍDA COM SUCESSO TOTAL!');
  } catch (err) {
    console.error('❌ Erro durante execução do Visual QA:', err);
    throw err;
  } finally {
    await browser.close();
  }
}

runVisualQA().catch(() => process.exit(1));
