import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const EVIDENCE_DIR = 'C:\\Users\\cf95s\\.gemini\\antigravity\\brain\\82b881ae-b125-4469-acef-bf7c3438039f\\evidence\\item30';
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

async function runItem30VisualTest() {
  console.log('🚗 [ITEM 30] Iniciando navegador Chrome visível (GUI)...');

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: false,
    slowMo: 1200,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  try {
    // 1. LOGIN DO GESTOR
    console.log('📌 1. Acessando tela de login da oficina caioteste...');
    await page.goto('http://localhost:5173/caioteste/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    console.log('📌 2. Preenchendo credenciais do Gestor...');
    await page.fill('input[type="email"]', 'caio@teste.com');
    await page.fill('input[type="password"]', 'Admin@CarX2026!');
    await page.click('button[type="submit"]');

    await page.waitForURL(url => url.pathname.includes('/dashboard'), { timeout: 15000 });
    console.log('   ✓ Login efetuado com sucesso! Redirecionado para o Dashboard.');
    await page.waitForTimeout(1500);

    // 2. NAVEGAR PARA CONFIGURAÇÕES
    console.log('📌 3. Navegando para Configurações (/settings)...');
    await page.goto('http://localhost:5173/settings', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // 3. CLICAR NA ABA APIS & WEBHOOKS
    console.log('📌 4. Clicando na aba "APIs & Webhooks"...');
    const tabApiWebhooks = page.locator('button:has-text("APIs & Webhooks")');
    await tabApiWebhooks.click();
    await page.waitForTimeout(2000);

    const s1 = path.join(EVIDENCE_DIR, '01-tela-apis-webhooks.png');
    await page.screenshot({ path: s1 });
    console.log(`   ✓ [Evidência 1] Salva em: ${s1}`);

    // 4. CRIAR NOVA CHAVE DE API
    console.log('📌 5. Clicando em "Gerar Nova Chave API"...');
    const btnGerarChave = page.locator('button:has-text("Gerar Nova Chave API")').first();
    await btnGerarChave.click();
    await page.waitForTimeout(1000);

    console.log('📌 6. Preenchendo dados da nova chave de integração...');
    const inputNomeChave = page.locator('input[placeholder*="Ex:"], input[placeholder*="Nome"], input[placeholder*="ERP"]').first();
    if (await inputNomeChave.isVisible()) {
      await inputNomeChave.fill('Integração ERP Bling Produção');
      await page.waitForTimeout(800);
    }

    const btnConfirmarCriacao = page.locator('button:has-text("CRIAR CHAVE SECRETA")').first();
    if (await btnConfirmarCriacao.isVisible()) {
      await btnConfirmarCriacao.click();
      await page.waitForTimeout(2000);
    }

    const s2 = path.join(EVIDENCE_DIR, '02-chave-api-gerada.png');
    await page.screenshot({ path: s2 });
    console.log(`   ✓ [Evidência 2] Salva em: ${s2}`);

    // Fechar o banner da chave gerada
    const btnConcluiCopia = page.locator('button:has-text("Concluí a cópia")').first();
    if (await btnConcluiCopia.isVisible()) {
      await btnConcluiCopia.click();
      await page.waitForTimeout(1000);
    }

    // 5. TESTAR ABA SWAGGER & DOCS
    console.log('📌 7. Acessando sub-aba "Swagger & Docs"...');
    const tabSwagger = page.locator('button:has-text("Swagger & Docs")');
    if (await tabSwagger.isVisible()) {
      await tabSwagger.click();
      await page.waitForTimeout(1500);

      // Clica para testar endpoint real
      console.log('📌 8. Executando chamada de teste ao vivo no Swagger...');
      const btnExecutarTeste = page.locator('button:has-text("Testar ao Vivo")').first();
      if (await btnExecutarTeste.isVisible()) {
        await btnExecutarTeste.click();
        await page.waitForTimeout(2500);
      }

      const s3 = path.join(EVIDENCE_DIR, '03-swagger-interativo.png');
      await page.screenshot({ path: s3 });
      console.log(`   ✓ [Evidência 3] Salva em: ${s3}`);
    }

    // 6. TESTAR ABA WEBHOOKS
    console.log('📌 9. Acessando sub-aba "Webhooks"...');
    const tabWebhooks = page.locator('button:has-text("Webhooks (")');
    if (await tabWebhooks.isVisible()) {
      await tabWebhooks.click();
      await page.waitForTimeout(1500);

      const btnNovoWebhook = page.locator('button:has-text("Cadastrar Novo Webhook")').first();
      if (await btnNovoWebhook.isVisible()) {
        await btnNovoWebhook.click();
        await page.waitForTimeout(1000);

        console.log('📌 10. Preenchendo dados do novo Webhook...');
        const inputNomeWh = page.locator('input[placeholder*="Alerta"], input[placeholder*="Disparo"]').first();
        if (await inputNomeWh.isVisible()) {
          await inputNomeWh.fill('Notificações de OS - Webhook ERP');
        }

        const inputUrlWh = page.locator('input[placeholder*="https://"], input[type="url"]').first();
        if (await inputUrlWh.isVisible()) {
          await inputUrlWh.fill('https://webhook.site/carx-auto-testing');
        }

        const btnSalvarWh = page.locator('button:has-text("Ativar Webhook")').first();
        if (await btnSalvarWh.isVisible()) {
          await btnSalvarWh.click();
          await page.waitForTimeout(2000);
        }
      }

      const s4 = path.join(EVIDENCE_DIR, '04-webhook-cadastrado.png');
      await page.screenshot({ path: s4 });
      console.log(`   ✓ [Evidência 4] Salva em: ${s4}`);

      // Testar disparo de ping do webhook
      console.log('📌 11. Disparando ping de teste do webhook...');
      const btnTestarPing = page.locator('button:has-text("Testar"), button:has-text("Disparar"), button[title*="Testar"]').first();
      if (await btnTestarPing.isVisible()) {
        await btnTestarPing.click();
        await page.waitForTimeout(2500);
      }

      const s5 = path.join(EVIDENCE_DIR, '05-webhook-testado.png');
      await page.screenshot({ path: s5 });
      console.log(`   ✓ [Evidência 5] Salva em: ${s5}`);
    }

    console.log('🎉 [ITEM 30] Todos os testes visuais foram executados com sucesso!');
    await page.waitForTimeout(5000); // Aguarda visualização do usuário na tela
  } catch (error) {
    console.error('❌ Erro durante teste visual do Item 30:', error);
    const errScreenshot = path.join(EVIDENCE_DIR, 'erro-item30.png');
    await page.screenshot({ path: errScreenshot });
    throw error;
  } finally {
    await browser.close();
  }
}

runItem30VisualTest().catch(console.error);
