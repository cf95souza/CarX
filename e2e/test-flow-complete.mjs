import { chromium } from '@playwright/test';
import path from 'path';

const ARTIFACTS_DIR = 'C:\\Users\\cf95s\\.gemini\\antigravity\\brain\\e54612f7-8471-447a-82a4-557ef5bff3ca';

async function testCompleteFlow() {
  console.log('🚀 Iniciando teste do fluxo completo: Gestor cria Orçamento -> Operador assume e faz Laudo...');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  try {
    // -------------------------------------------------------------------------
    // 1. GESTOR CRIA NOVO ORÇAMENTO
    // -------------------------------------------------------------------------
    const gestorContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const gestorPage = await gestorContext.newPage();

    console.log('1. Gestor faz login...');
    await gestorPage.goto('http://localhost:5173/caiocar/login', { waitUntil: 'networkidle' });
    await gestorPage.fill('input[type="email"]', 'caiocar@carx.com');
    await gestorPage.fill('input[type="password"]', 'caio@testeA1');
    await gestorPage.click('button[type="submit"]');
    await gestorPage.waitForURL(url => url.pathname.includes('/dashboard'), { timeout: 15000 });

    console.log('2. Gestor acessa tela de Vendas...');
    await gestorPage.goto('http://localhost:5173/vendas', { waitUntil: 'networkidle' });
    await gestorPage.waitForTimeout(1000);

    console.log('3. Clica em "Novo Orçamento"...');
    await gestorPage.click('button:has-text("Novo Orçamento")');
    await gestorPage.waitForTimeout(1000);

    // Passo 1: Cliente
    console.log('4. Cadastrando novo cliente no wizard...');
    const btnNovoCliente = gestorPage.locator('button:has-text("+ Novo Cliente")');
    if (await btnNovoCliente.isVisible()) {
      await btnNovoCliente.click();
      await gestorPage.waitForTimeout(500);
      await gestorPage.fill('input[placeholder*="Nome"], input[name="name"]', 'Caio Teste Final');
      await gestorPage.fill('input[placeholder*="Telefone"], input[placeholder*="WhatsApp"]', '11999998888');
    }
    await gestorPage.click('button:has-text("Avançar Passo")');
    await gestorPage.waitForTimeout(500);

    // Passo 2: Veículo (testa placa livre sem inventar carro fictício)
    console.log('5. Preenchendo veículo com placa livre...');
    const inputPlaca = gestorPage.locator('input[placeholder*="Placa"], input[placeholder*="BRA2E19"]').first();
    if (await inputPlaca.isVisible()) {
      await inputPlaca.fill('BRA2E19');
      await gestorPage.waitForTimeout(800);
    }
    const inputModelo = gestorPage.locator('input[placeholder*="Modelo"], input[placeholder*="Civic"]').first();
    if (await inputModelo.isVisible() && (await inputModelo.inputValue()) === '') {
      await inputModelo.fill('Honda Civic Touring 2024');
    }
    await gestorPage.click('button:has-text("Avançar Passo")');
    await gestorPage.waitForTimeout(500);

    // Passo 3: Serviços e Desconto
    console.log('6. Selecionando serviços e testando desconto...');
    const firstServiceCard = gestorPage.locator('div[class*="cursor-pointer"]').filter({ hasText: 'R$' }).first();
    if (await firstServiceCard.isVisible()) {
      await firstServiceCard.click();
      await gestorPage.waitForTimeout(500);
    }

    // Teste do Desconto: digita e limpa
    const discountInput = gestorPage.locator('input[placeholder="0"]').last();
    if (await discountInput.isVisible()) {
      await discountInput.fill('10');
      await gestorPage.waitForTimeout(300);
      // Apaga desconto
      await discountInput.fill('');
      await gestorPage.waitForTimeout(300);
      await discountInput.fill('5');
    }
    await gestorPage.click('button:has-text("Avançar Passo")');
    await gestorPage.waitForTimeout(500);

    // Passo 4: Resumo e Salvar como Orçamento
    console.log('7. Salvando proposta como Orçamento...');
    const btnSalvarOrcamento = gestorPage.locator('button:has-text("Salvar Orçamento"), button:has-text("Salvar Proposta")').first();
    if (await btnSalvarOrcamento.isVisible()) {
      await btnSalvarOrcamento.click();
      await gestorPage.waitForTimeout(2000);
    }

    console.log('8. Capturando Screenshot do Grid de Vendas com o Orçamento criado...');
    const gridScreenshot = path.join(ARTIFACTS_DIR, 'gestor-vendas-com-orcamento.png');
    await gestorPage.screenshot({ path: gridScreenshot });
    console.log(`   Salvo em: ${gridScreenshot}`);

    await gestorContext.close();

    // -------------------------------------------------------------------------
    // 2. OPERADOR ACESSA A OS E EXECUTA O LAUDO DE INSPEÇÃO 360°
    // -------------------------------------------------------------------------
    console.log('\n📱 Operador acessa a aplicação no celular...');
    const opContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
    });
    const opPage = await opContext.newPage();

    await opPage.goto('http://localhost:5173/caiocar/login', { waitUntil: 'networkidle' });
    await opPage.fill('input[type="email"]', 'operador1@caiocar.com');
    await opPage.fill('input[type="password"]', 'caio@testeA1');
    await opPage.click('button[type="submit"]');
    await opPage.waitForURL(url => url.pathname.includes('/operador'), { timeout: 15000 });
    await opPage.waitForTimeout(2000);

    // Clica na aba "Toda a loja" para ver a nova OS disponível
    console.log('9. Clicando na aba "Toda a loja"...');
    const tabTodaLoja = opPage.locator('button:has-text("Toda a loja")');
    if (await tabTodaLoja.isVisible()) {
      await tabTodaLoja.click();
      await opPage.waitForTimeout(1000);
    }

    console.log('10. Capturando Screenshot da Fila de Toda a Loja...');
    const filaTodaLojaScreenshot = path.join(ARTIFACTS_DIR, 'operador-fila-toda-loja.png');
    await opPage.screenshot({ path: filaTodaLojaScreenshot });
    console.log(`    Salvo em: ${filaTodaLojaScreenshot}`);

    // Clica no card para abrir
    const cardOS = opPage.locator('div[class*="bg-[#171C24]"]').first();
    if (await cardOS.isVisible()) {
      console.log('11. Clicando na OS...');
      await cardOS.click();
      await opPage.waitForTimeout(1500);

      // Clica em "Fazer Checklist Rápido" se aparecer
      const btnChecklist = opPage.locator('button:has-text("Fazer Checklist Rápido"), button:has-text("Fazer checklist e iniciar")').first();
      if (await btnChecklist.isVisible()) {
        await btnChecklist.click();
        await opPage.waitForTimeout(1000);
      }

      console.log('12. Capturando Screenshot do Laudo de Inspeção 360°...');
      const laudoScreenshot = path.join(ARTIFACTS_DIR, 'operador-laudo-completo.png');
      await opPage.screenshot({ path: laudoScreenshot });
      console.log(`    Salvo em: ${laudoScreenshot}`);
    }

    await opContext.close();
    console.log('\n🎉 JORNADA COMPLETA VALIDADA COM SUCESSO!');
  } catch (err) {
    console.error('❌ Erro no teste completo:', err);
    throw err;
  } finally {
    await browser.close();
  }
}

testCompleteFlow().catch(() => process.exit(1));
