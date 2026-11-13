const pg = require('pg');
const bcrypt = require('bcryptjs');

const pool = new pg.Pool({
  connectionString: 'postgresql://carx_dev_user:carx_dev_password@127.0.0.1:5433/carx_dev',
});

async function main() {
  const password = 'Admin@CarX2026!';
  const hash = await bcrypt.hash(password, 10);
  console.log('Gerado hash bcrypt para Admin@CarX2026!');

  // 1. Atualizar senha de caioteste@carx.com.br
  await pool.query(
    'UPDATE users SET password_hash = $1, is_active = true WHERE email = $2',
    [hash, 'caioteste@carx.com.br']
  );
  console.log('Senha de caioteste@carx.com.br atualizada para Admin@CarX2026!');

  // 2. Verificar/Criar caio@teste.com
  const existingCaio = await pool.query('SELECT id FROM users WHERE email = $1', ['caio@teste.com']);
  let caioId;
  if (existingCaio.rows.length === 0) {
    const insertRes = await pool.query(
      'INSERT INTO users (name, email, password_hash, is_active) VALUES ($1, $2, $3, true) RETURNING id',
      ['Caio Gestor', 'caio@teste.com', hash]
    );
    caioId = insertRes.rows[0].id;
    console.log('Criado usuario caio@teste.com com ID:', caioId);
  } else {
    caioId = existingCaio.rows[0].id;
    await pool.query('UPDATE users SET password_hash = $1, is_active = true WHERE id = $2', [hash, caioId]);
    console.log('Senha de caio@teste.com atualizada para Admin@CarX2026!');
  }

  // 3. Vincular caio@teste.com à oficina CaioTeste como owner
  const tenantRes = await pool.query("SELECT id FROM tenants WHERE slug = 'caioteste' LIMIT 1");
  if (tenantRes.rows.length > 0) {
    const tenantId = tenantRes.rows[0].id;
    const unitRes = await pool.query('SELECT id FROM units WHERE tenant_id = $1 LIMIT 1', [tenantId]);
    const unitId = unitRes.rows[0]?.id || null;

    const existingMem = await pool.query(
      'SELECT id FROM memberships WHERE user_id = $1 AND tenant_id = $2',
      [caioId, tenantId]
    );
    if (existingMem.rows.length === 0) {
      await pool.query(
        "INSERT INTO memberships (tenant_id, unit_id, user_id, role, is_active) VALUES ($1, $2, $3, 'owner', true)",
        [tenantId, unitId, caioId]
      );
      console.log('Vinculado caio@teste.com como owner de CaioTeste');
    } else {
      await pool.query(
        "UPDATE memberships SET role = 'owner', is_active = true WHERE user_id = $1 AND tenant_id = $2",
        [caioId, tenantId]
      );
      console.log('Atualizado papel de caio@teste.com para owner');
    }
  }

  // 4. Exibir estado final
  const users = await pool.query('SELECT id, name, email, is_active FROM users;');
  console.log('--- USUARIOS NO BANCO ---');
  console.table(users.rows);

  const memberships = await pool.query(
    'SELECT m.id, u.email as user_email, t.slug as tenant_slug, t.trade_name, m.role FROM memberships m JOIN users u ON u.id = m.user_id JOIN tenants t ON t.id = m.tenant_id;'
  );
  console.log('--- MEMBRO E PAPEL ---');
  console.table(memberships.rows);

  await pool.end();
}

main().catch(console.error);

