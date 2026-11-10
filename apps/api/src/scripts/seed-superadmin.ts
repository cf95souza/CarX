import { adminPool } from '../database/db.js';
import { hashPassword, comparePassword } from '../auth/password.js';

async function run() {
  const email = 'admin@carx.com.br';
  const rawPassword = 'Admin@CarX2026!';
  const hash = await hashPassword(rawPassword);

  console.log('Gerado hash para', email, ':', hash);
  const isValid = await comparePassword(rawPassword, hash);
  console.log('Validação local:', isValid);

  // 1. Atualizar ou inserir em superadmin_users
  await adminPool.query(
    `INSERT INTO superadmin_users (id, name, email, password_hash, is_active, two_factor_enabled)
     VALUES ('8d7dd418-814a-465e-b113-11c10ee8003a', 'Super Admin CarX', $1, $2, true, false)
     ON CONFLICT (email) DO UPDATE
     SET password_hash = EXCLUDED.password_hash,
         is_active = true,
         two_factor_enabled = false;`,
    [email, hash]
  );

  // 2. Atualizar ou inserir em users + platform_admins
  const userRes = await adminPool.query(
    `INSERT INTO users (id, name, email, password_hash, is_active, two_factor_enabled)
     VALUES ('8d7dd418-814a-465e-b113-11c10ee8003a', 'Super Admin CarX', $1, $2, true, false)
     ON CONFLICT (email) DO UPDATE
     SET password_hash = EXCLUDED.password_hash,
         is_active = true,
         two_factor_enabled = false
     RETURNING id;`,
    [email, hash]
  );

  const userId = userRes.rows[0].id;
  await adminPool.query(
    `INSERT INTO platform_admins (user_id, is_superadmin, can_manage_tenants, can_manage_billing)
     VALUES ($1, true, true, true)
     ON CONFLICT (user_id) DO UPDATE
     SET is_superadmin = true, can_manage_tenants = true, can_manage_billing = true;`,
    [userId]
  );

  console.log('Superadmin atualizado com sucesso no banco!');
  process.exit(0);
}

run().catch((err) => {
  console.error('Erro ao atualizar superadmin:', err);
  process.exit(1);
});

