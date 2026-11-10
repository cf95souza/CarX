export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'CarX Public API & Webhooks',
    version: '1.0.0',
    description:
      'API pública para integrações externas com ERPs, CRMs e plataformas de mensageria automotiva. Autenticação via Chave de API (`X-API-Key: carx_live_...`) ou Bearer Token com isolamento Fail-Closed RLS.',
    contact: {
      name: 'CarX Suporte & Engenharia',
      url: 'https://carx.com.br/suporte',
      email: 'integracoes@carx.com.br',
    },
  },
  servers: [
    {
      url: 'https://api.carx.com.br',
      description: 'Servidor de Produção Oficial',
    },
    {
      url: 'http://localhost:3000',
      description: 'Ambiente de Desenvolvimento Local',
    },
  ],
  security: [
    {
      ApiKeyAuth: [],
    },
    {
      BearerAuth: [],
    },
  ],
  paths: {
    '/v1/work-orders': {
      get: {
        summary: 'Listar Ordens de Serviço',
        description: 'Retorna a listagem paginada de ordens de serviço da oficina autenticada.',
        tags: ['Ordens de Serviço'],
        parameters: [
          {
            name: 'status',
            in: 'query',
            description: 'Filtrar por status da OS (ex: IN_PROGRESS, READY, DELIVERED)',
            required: false,
            schema: { type: 'string' },
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Quantidade de registros por página (máximo 100)',
            required: false,
            schema: { type: 'integer', default: 20 },
          },
          {
            name: 'offset',
            in: 'query',
            description: 'Deslocamento para paginação',
            required: false,
            schema: { type: 'integer', default: 0 },
          },
        ],
        responses: {
          '200': {
            description: 'Lista de ordens de serviço retornada com sucesso',
            headers: {
              'X-RateLimit-Limit': { schema: { type: 'integer' } },
              'X-RateLimit-Remaining': { schema: { type: 'integer' } },
              'X-RateLimit-Reset': { schema: { type: 'integer' } },
            },
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    workOrders: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/WorkOrder' },
                    },
                    total: { type: 'integer' },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
          '403': { $ref: '#/components/responses/ForbiddenError' },
          '429': { $ref: '#/components/responses/RateLimitError' },
        },
      },
      post: {
        summary: 'Criar Ordem de Serviço Externa',
        description: 'Abre uma nova ordem de serviço integrada a partir de CRM ou ERP externo.',
        tags: ['Ordens de Serviço'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateWorkOrderInput' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Ordem de serviço criada com sucesso',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/WorkOrder' },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequestError' },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
          '403': { $ref: '#/components/responses/ForbiddenError' },
        },
      },
    },
    '/v1/work-orders/{id}': {
      get: {
        summary: 'Obter Detalhes da Ordem de Serviço',
        description: 'Retorna dados completos, itens, serviços e status de uma OS.',
        tags: ['Ordens de Serviço'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'UUID da Ordem de Serviço',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'Detalhes da OS recuperados com sucesso',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/WorkOrder' },
              },
            },
          },
          '404': { description: 'Ordem de serviço não encontrada' },
        },
      },
    },
    '/v1/customers': {
      get: {
        summary: 'Listar Clientes',
        description: 'Retorna a lista de clientes cadastrados na oficina.',
        tags: ['Clientes'],
        responses: {
          '200': {
            description: 'Lista de clientes retornada com sucesso',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    customers: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Customer' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/v1/nps': {
      get: {
        summary: 'Listar Pesquisas de Satisfação (NPS)',
        description: 'Retorna o histórico de avaliações e notas dos clientes.',
        tags: ['NPS & Pós-Venda'],
        responses: {
          '200': {
            description: 'Lista de avaliações NPS retornada',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    surveys: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/NpsSurvey' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'Chave de API pública CarX (ex: `carx_live_...`)',
      },
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        description: 'Bearer token formatado como `Bearer carx_live_...`',
      },
    },
    schemas: {
      WorkOrder: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          osNumber: { type: 'integer' },
          status: { type: 'string' },
          customerId: { type: 'string', format: 'uuid' },
          customerName: { type: 'string' },
          vehicleId: { type: 'string', format: 'uuid' },
          vehiclePlate: { type: 'string' },
          vehicleModel: { type: 'string' },
          totalCents: { type: 'integer' },
          scheduledAt: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateWorkOrderInput: {
        type: 'object',
        required: ['customerId', 'vehicleId'],
        properties: {
          customerId: { type: 'string', format: 'uuid' },
          vehicleId: { type: 'string', format: 'uuid' },
          notes: { type: 'string' },
          scheduledAt: { type: 'string', format: 'date-time' },
        },
      },
      Customer: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          phone: { type: 'string' },
          email: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      NpsSurvey: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          workOrderId: { type: 'string', format: 'uuid' },
          score: { type: 'integer' },
          classification: { type: 'string', enum: ['promoter', 'passive', 'detractor'] },
          comment: { type: 'string' },
          answeredAt: { type: 'string', format: 'date-time' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' },
        },
      },
    },
    responses: {
      UnauthorizedError: {
        description: 'Credencial ausente ou inválida',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      ForbiddenError: {
        description: 'Escopo ou permissão insuficiente',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      BadRequestError: {
        description: 'Dados de requisição inválidos',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      RateLimitError: {
        description: 'Limite de requisições excedido',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: { type: 'string', example: 'RATE_LIMIT_EXCEEDED' },
                message: { type: 'string' },
                resetInSeconds: { type: 'integer' },
              },
            },
          },
        },
      },
    },
  },
};

export function renderSwaggerUiHtml(specJsonUrl: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>CarX — Documentação da API Pública & Webhooks</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
  <style>
    body {
      margin: 0;
      background: #0E1116;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .swagger-ui {
      filter: invert(88%) hue-rotate(180deg);
    }
    .swagger-ui .topbar { display: none; }
    .carx-header {
      background: #171C24;
      padding: 16px 24px;
      border-bottom: 2px solid #C8F52E;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .carx-logo {
      color: #C8F52E;
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .carx-badge {
      background: rgba(200, 245, 46, 0.1);
      color: #C8F52E;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      border: 1px solid rgba(200, 245, 46, 0.3);
    }
  </style>
</head>
<body>
  <div class="carx-header">
    <div class="carx-logo">CarX <span style="color: #FFFFFF; font-weight: 400; font-size: 16px;">| API Pública v1</span></div>
    <div class="carx-badge">OpenAPI 3.0</div>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: '${specJsonUrl}',
        dom_id: '#swagger-ui',
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout",
        deepLinking: true
      });
    };
  </script>
</body>
</html>`;
}

