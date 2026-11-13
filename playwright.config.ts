import { defineConfig, devices } from '@playwright/test';

/**
 * Configuração Oficial do Playwright para o CarX SaaS (T3.16)
 * Suporta testes de APIRequestContext e testes de interface dos fluxos críticos
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Execução sequencial para garantir integridade do ciclo de vida da OS
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: process.env.API_URL || 'http://127.0.0.1:3333',
    trace: 'on-first-retry',
    extraHTTPHeaders: {
      'Accept': 'application/json',
    },
  },
  projects: [
    {
      name: 'api-e2e',
      testMatch: /.*\.spec\.ts/,
    },
  ],
  webServer: {
    command: 'pnpm --filter @carx/api run start:ts',
    url: 'http://127.0.0.1:3333/health',
    reuseExistingServer: true,
    timeout: 30000,
  },
});
