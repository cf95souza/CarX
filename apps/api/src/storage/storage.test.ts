import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { adminPool } from '../database/db.js';
import { buildServer } from '../server.js';
import { signJwt } from '../auth/jwt.js';
import { storageService, StorageForbiddenError } from './storage-service.js';
import { validateFileMagicBytes, MagicBytesError } from './magic-bytes.js';
import { UserRole } from '@carx/shared';
import type { FastifyInstance } from 'fastify';

/**
 * Utilitário para construir payloads multipart/form-data em testes sem dependências extras
 */
function buildMultipartPayload(
  fields: Record<string, string>,
  file: { fieldName: string; fileName: string; contentType: string; data: Buffer }
) {
  const boundary = '----FastifyTestBoundary' + crypto.randomBytes(8).toString('hex');
  const CRLF = '\r\n';
  const chunks: Buffer[] = [];

  for (const [key, val] of Object.entries(fields)) {
    chunks.push(
      Buffer.from(`--${boundary}${CRLF}Content-Disposition: form-data; name="${key}"${CRLF}${CRLF}${val}${CRLF}`)
    );
  }

  chunks.push(
    Buffer.from(
      `--${boundary}${CRLF}Content-Disposition: form-data; name="${file.fieldName}"; filename="${file.fileName}"${CRLF}Content-Type: ${file.contentType}${CRLF}${CRLF}`
    )
  );
  chunks.push(file.data);
  chunks.push(Buffer.from(`${CRLF}--${boundary}--${CRLF}`));

  return {
    contentType: `multipart/form-data; boundary=${boundary}`,
    body: Buffer.concat(chunks),
  };
}

describe('T2.8 — Armazenamento de Arquivos com MinIO (Compatível S3)', () => {
  let app: FastifyInstance;

  const tenantSlugAlpha = 'storage-alpha';
  const tenantSlugBeta = 'storage-beta';

  let tenantIdAlpha: string;
  let tenantIdBeta: string;

  let ownerUserIdAlpha: string;
  let ownerUserIdBeta: string;

  let ownerTokenAlpha: string;
  let ownerTokenBeta: string;

  // Buffers de teste com magic bytes canônicos
  const validJpegBuffer = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
    0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0xff, 0xd9,
  ]);

  const validPngBuffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  ]);

  const validPdfBuffer = Buffer.from(
    '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\nxref\n0 1\n0000000000 65535 f\ntrailer\n<< /Root 1 0 R >>\n%%EOF'
  );

  // Buffer malicioso: Executável Windows (MZ) disfarçado
  const maliciousExeBuffer = Buffer.from([
    0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00,
    0xb8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x40, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  ]);

  // Buffer malicioso: SVG contendo script XSS
  const maliciousSvgBuffer = Buffer.from(
    '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><circle cx="50" cy="50" r="40"/></svg>'
  );

  // Buffer malicioso: Shell script com shebang
  const maliciousShellBuffer = Buffer.from('#!/bin/bash\nrm -rf /tmp/data\n');

  before(async () => {
    app = buildServer();
    await app.ready();

    // Limpeza de testes prévios
    await adminPool.query(`
      SELECT set_config('app.bypass_audit_immutability', 'true', false);
      DELETE FROM storage_files WHERE tenant_id IN (SELECT id FROM tenants WHERE slug IN ('${tenantSlugAlpha}', '${tenantSlugBeta}'));
      DELETE FROM audit_logs WHERE tenant_id IN (SELECT id FROM tenants WHERE slug IN ('${tenantSlugAlpha}', '${tenantSlugBeta}'));
      DELETE FROM memberships WHERE tenant_id IN (SELECT id FROM tenants WHERE slug IN ('${tenantSlugAlpha}', '${tenantSlugBeta}'));
      DELETE FROM units WHERE tenant_id IN (SELECT id FROM tenants WHERE slug IN ('${tenantSlugAlpha}', '${tenantSlugBeta}'));
      DELETE FROM users WHERE email IN ('owner.storage.alpha@carx.local', 'owner.storage.beta@carx.local');
      DELETE FROM tenants WHERE slug IN ('${tenantSlugAlpha}', '${tenantSlugBeta}');
    `);

    // Criar Tenant Alpha
    const alphaRes = await adminPool.query<{ id: string }>(`
      INSERT INTO tenants (slug, trade_name, legal_name, email, status)
      VALUES ('${tenantSlugAlpha}', 'Oficina Storage Alpha', 'Alpha Reparadora LTDA', 'alpha@storage.local', 'active')
      RETURNING id;
    `);
    tenantIdAlpha = alphaRes.rows[0].id;

    // Criar Tenant Beta
    const betaRes = await adminPool.query<{ id: string }>(`
      INSERT INTO tenants (slug, trade_name, legal_name, email, status)
      VALUES ('${tenantSlugBeta}', 'Centro Storage Beta', 'Beta Detail LTDA', 'beta@storage.local', 'active')
      RETURNING id;
    `);
    tenantIdBeta = betaRes.rows[0].id;

    // Criar Usuário Alpha
    const userAlphaRes = await adminPool.query<{ id: string }>(`
      INSERT INTO users (email, name, password_hash)
      VALUES ('owner.storage.alpha@carx.local', 'Gestor Alpha', 'hash')
      RETURNING id;
    `);
    ownerUserIdAlpha = userAlphaRes.rows[0].id;

    // Criar Usuário Beta
    const userBetaRes = await adminPool.query<{ id: string }>(`
      INSERT INTO users (email, name, password_hash)
      VALUES ('owner.storage.beta@carx.local', 'Gestor Beta', 'hash')
      RETURNING id;
    `);
    ownerUserIdBeta = userBetaRes.rows[0].id;

    // Units
    const unitAlphaRes = await adminPool.query<{ id: string }>(`
      INSERT INTO units (tenant_id, name, slug) VALUES ('${tenantIdAlpha}', 'Matriz Alpha', 'matriz') RETURNING id;
    `);
    const unitBetaRes = await adminPool.query<{ id: string }>(`
      INSERT INTO units (tenant_id, name, slug) VALUES ('${tenantIdBeta}', 'Matriz Beta', 'matriz') RETURNING id;
    `);

    // Memberships
    await adminPool.query(`
      INSERT INTO memberships (tenant_id, user_id, unit_id, role)
      VALUES
        ('${tenantIdAlpha}', '${ownerUserIdAlpha}', '${unitAlphaRes.rows[0].id}', 'owner'),
        ('${tenantIdBeta}', '${ownerUserIdBeta}', '${unitBetaRes.rows[0].id}', 'owner');
    `);

    // Tokens JWT
    ownerTokenAlpha = signJwt({
      userId: ownerUserIdAlpha,
      email: 'owner.storage.alpha@carx.local',
      role: UserRole.OWNER,
      tenantId: tenantIdAlpha,
      unitId: unitAlphaRes.rows[0].id,
    });

    ownerTokenBeta = signJwt({
      userId: ownerUserIdBeta,
      email: 'owner.storage.beta@carx.local',
      role: UserRole.OWNER,
      tenantId: tenantIdBeta,
      unitId: unitBetaRes.rows[0].id,
    });
  });

  after(async () => {
    await adminPool.query(`
      SELECT set_config('app.bypass_audit_immutability', 'true', false);
      DELETE FROM storage_files WHERE tenant_id IN (SELECT id FROM tenants WHERE slug IN ('${tenantSlugAlpha}', '${tenantSlugBeta}'));
      DELETE FROM memberships WHERE tenant_id IN (SELECT id FROM tenants WHERE slug IN ('${tenantSlugAlpha}', '${tenantSlugBeta}'));
      DELETE FROM units WHERE tenant_id IN (SELECT id FROM tenants WHERE slug IN ('${tenantSlugAlpha}', '${tenantSlugBeta}'));
      DELETE FROM users WHERE email IN ('owner.storage.alpha@carx.local', 'owner.storage.beta@carx.local');
      DELETE FROM tenants WHERE slug IN ('${tenantSlugAlpha}', '${tenantSlugBeta}');
    `);
  });

  it('DETECTOR MAGIC BYTES: valida imagens reais (JPEG, PNG) e laudos PDF com sucesso', () => {
    const jpeg = validateFileMagicBytes(validJpegBuffer, 'image/jpeg', 'foto.jpg');
    assert.equal(jpeg.mime, 'image/jpeg');
    assert.equal(jpeg.extension, 'jpg');

    const png = validateFileMagicBytes(validPngBuffer, 'image/png', 'logo.png');
    assert.equal(png.mime, 'image/png');
    assert.equal(png.extension, 'png');

    const pdf = validateFileMagicBytes(validPdfBuffer, 'application/pdf', 'laudo.pdf');
    assert.equal(pdf.mime, 'application/pdf');
    assert.equal(pdf.extension, 'pdf');
  });

  it('CRITÉRIO DE ACEITE: executável (.exe) renomeado para .jpg é terminantemente rejeitado na API', async () => {
    // 1. Validação unitária direta
    assert.throws(
      () => validateFileMagicBytes(maliciousExeBuffer, 'image/jpeg', 'foto_carro.jpg'),
      (err: unknown) => {
        const error = err as MagicBytesError;
        return error.statusCode === 400 && error.code === 'SECURITY_VIOLATION';
      }
    );

    // 2. Validação através do endpoint HTTP Fastify
    const payload = buildMultipartPayload(
      { category: 'work_order' },
      {
        fieldName: 'file',
        fileName: 'foto_carro.jpg',
        contentType: 'image/jpeg',
        data: maliciousExeBuffer,
      }
    );

    const res = await app.inject({
      method: 'POST',
      url: '/storage/upload',
      headers: {
        authorization: `Bearer ${ownerTokenAlpha}`,
        'x-tenant-id': tenantIdAlpha,
        'content-type': payload.contentType,
      },
      payload: payload.body,
    });

    assert.equal(res.statusCode, 400);
    const body = JSON.parse(res.body);
    assert.equal(body.code, 'SECURITY_VIOLATION');
    assert.match(body.message, /executável/i);
  });

  it('BLOQUEIO DE SEGURANÇA: upload de arquivo SVG é bloqueado por conter potencial vetor XSS', async () => {
    const payload = buildMultipartPayload(
      { category: 'branding' },
      {
        fieldName: 'file',
        fileName: 'logo_oficina.svg',
        contentType: 'image/svg+xml',
        data: maliciousSvgBuffer,
      }
    );

    const res = await app.inject({
      method: 'POST',
      url: '/storage/upload',
      headers: {
        authorization: `Bearer ${ownerTokenAlpha}`,
        'x-tenant-id': tenantIdAlpha,
        'content-type': payload.contentType,
      },
      payload: payload.body,
    });

    assert.equal(res.statusCode, 400);
    const body = JSON.parse(res.body);
    assert.match(body.message, /SVG não é aceito/i);
  });

  it('BLOQUEIO DE SEGURANÇA: script shell (#!) renomeado para imagem é rejeitado', async () => {
    const payload = buildMultipartPayload(
      { category: 'general' },
      {
        fieldName: 'file',
        fileName: 'foto.png',
        contentType: 'image/png',
        data: maliciousShellBuffer,
      }
    );

    const res = await app.inject({
      method: 'POST',
      url: '/storage/upload',
      headers: {
        authorization: `Bearer ${ownerTokenAlpha}`,
        'x-tenant-id': tenantIdAlpha,
        'content-type': payload.contentType,
      },
      payload: payload.body,
    });

    assert.equal(res.statusCode, 400);
    const body = JSON.parse(res.body);
    assert.match(body.message, /Script de terminal/i);
  });

  it('UPLOAD LEGÍTIMO: salva imagem JPEG com sucesso e estrutura de chave tenant/{id}/...', async () => {
    const payload = buildMultipartPayload(
      { category: 'work_order' },
      {
        fieldName: 'file',
        fileName: 'avaria_lateral_dianteira.jpg',
        contentType: 'image/jpeg',
        data: validJpegBuffer,
      }
    );

    const res = await app.inject({
      method: 'POST',
      url: '/storage/upload',
      headers: {
        authorization: `Bearer ${ownerTokenAlpha}`,
        'x-tenant-id': tenantIdAlpha,
        'content-type': payload.contentType,
      },
      payload: payload.body,
    });

    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.body);

    assert.equal(body.tenant_id, tenantIdAlpha);
    assert.equal(body.original_name, 'avaria_lateral_dianteira.jpg');
    assert.equal(body.real_mime_type, 'image/jpeg');
    assert.ok(body.file_key.startsWith(`tenant/${tenantIdAlpha}/work_order/`));
    assert.ok(body.url.includes('http'));
  });

  it('CRITÉRIO DE ACEITE CROSS-TENANT: link de arquivo da Oficina Alpha NÃO é acessível pela Oficina Beta', async () => {
    // 1. Alpha faz upload de um documento confidencial
    const uploadPayload = buildMultipartPayload(
      { category: 'document' },
      {
        fieldName: 'file',
        fileName: 'laudo_vistoria_alpha.pdf',
        contentType: 'application/pdf',
        data: validPdfBuffer,
      }
    );

    const uploadRes = await app.inject({
      method: 'POST',
      url: '/storage/upload',
      headers: {
        authorization: `Bearer ${ownerTokenAlpha}`,
        'x-tenant-id': tenantIdAlpha,
        'content-type': uploadPayload.contentType,
      },
      payload: uploadPayload.body,
    });

    assert.equal(uploadRes.statusCode, 201);
    const alphaFile = JSON.parse(uploadRes.body);

    // 2. Beta tenta gerar URL pré-assinada para o ID do arquivo de Alpha
    const betaAccessRes = await app.inject({
      method: 'GET',
      url: `/storage/files/${alphaFile.id}/url`,
      headers: {
        authorization: `Bearer ${ownerTokenBeta}`,
        'x-tenant-id': tenantIdBeta,
      },
    });

    // RLS e guarda de tenant impedem que Beta encontre o registro de Alpha
    assert.equal(betaAccessRes.statusCode, 404);

    // 3. Validação defensiva na camada de serviço (tentativa de bypass com chave bruta)
    assert.throws(
      () => storageService.assertTenantFileKey(tenantIdBeta, alphaFile.file_key),
      (err: unknown) => {
        const error = err as StorageForbiddenError;
        return error.statusCode === 403 && error.code === 'CROSS_TENANT_ACCESS_DENIED';
      }
    );
  });

  it('PATH TRAVERSAL: bloqueia tentativa de navegar diretórios via .. na chave do arquivo', () => {
    assert.throws(
      () => storageService.assertTenantFileKey(tenantIdAlpha, `tenant/${tenantIdAlpha}/../../storage-beta/secreto.jpg`),
      /Path Traversal/
    );
  });

  it('PRESIGNED UPLOAD: gera URL de upload direto S3 com padrão tenant/{id}/...', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/storage/presigned-upload',
      headers: {
        authorization: `Bearer ${ownerTokenAlpha}`,
        'x-tenant-id': tenantIdAlpha,
      },
      payload: {
        fileName: 'foto_inspecao.png',
        mimeType: 'image/png',
        sizeBytes: 1024 * 500, // 500 KB
        category: 'inspection',
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);

    assert.ok(body.uploadUrl.includes('X-Amz-Signature'));
    assert.ok(body.fileKey.startsWith(`tenant/${tenantIdAlpha}/inspection/`));
    assert.equal(body.bucketName, 'carx-media');
    assert.equal(body.expiresInSeconds, 900);
  });

  it('PRESIGNED UPLOAD: rejeita solicitação de URL para SVG ou tipos não permitidos', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/storage/presigned-upload',
      headers: {
        authorization: `Bearer ${ownerTokenAlpha}`,
        'x-tenant-id': tenantIdAlpha,
      },
      payload: {
        fileName: 'vetor.svg',
        mimeType: 'image/svg+xml',
        sizeBytes: 1024,
      },
    });

    assert.equal(res.statusCode, 400);
  });

  it('CONSUMO DE ARMAZENAMENTO: /tenant/storage-usage reporta arquivos e cotas da oficina', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/tenant/storage-usage',
      headers: {
        authorization: `Bearer ${ownerTokenAlpha}`,
        'x-tenant-id': tenantIdAlpha,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);

    assert.equal(body.tenantId, tenantIdAlpha);
    assert.ok(body.totalFiles >= 2);
    assert.ok(body.usedBytes > 0);
    assert.equal(body.quotaMb, 1024); // 1 GB no plano Essencial
  });

  it('EXCLUSÃO SEGURA: remove arquivo do MinIO e do banco com contexto isolado', async () => {
    // 1. Upload de arquivo para excluir
    const uploadPayload = buildMultipartPayload(
      { category: 'general' },
      {
        fieldName: 'file',
        fileName: 'para_excluir.jpg',
        contentType: 'image/jpeg',
        data: validJpegBuffer,
      }
    );

    const uploadRes = await app.inject({
      method: 'POST',
      url: '/storage/upload',
      headers: {
        authorization: `Bearer ${ownerTokenAlpha}`,
        'x-tenant-id': tenantIdAlpha,
        'content-type': uploadPayload.contentType,
      },
      payload: uploadPayload.body,
    });

    const fileToDelete = JSON.parse(uploadRes.body);

    // 2. Beta tenta excluir o arquivo de Alpha (deve falhar com 404 devido ao RLS)
    const betaDeleteRes = await app.inject({
      method: 'DELETE',
      url: `/storage/files/${fileToDelete.id}`,
      headers: {
        authorization: `Bearer ${ownerTokenBeta}`,
        'x-tenant-id': tenantIdBeta,
      },
    });

    assert.equal(betaDeleteRes.statusCode, 404);

    // 3. Alpha exclui legitimamente o seu próprio arquivo
    const alphaDeleteRes = await app.inject({
      method: 'DELETE',
      url: `/storage/files/${fileToDelete.id}`,
      headers: {
        authorization: `Bearer ${ownerTokenAlpha}`,
        'x-tenant-id': tenantIdAlpha,
      },
    });

    assert.equal(alphaDeleteRes.statusCode, 200);

    // 4. Confirma que o arquivo não existe mais
    const checkRes = await app.inject({
      method: 'GET',
      url: `/storage/files/${fileToDelete.id}/url`,
      headers: {
        authorization: `Bearer ${ownerTokenAlpha}`,
        'x-tenant-id': tenantIdAlpha,
      },
    });

    assert.equal(checkRes.statusCode, 404);
  });
});
