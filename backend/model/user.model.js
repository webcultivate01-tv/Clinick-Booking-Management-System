import { pool } from '../config/db.js';

const PUBLIC_FIELDS = 'id, full_name, email, mobile, role, gender, dob, profile_image, is_active, created_at, updated_at';

export async function findUserByEmail(email) {
  const [rows] = await pool.query(
    `SELECT id, full_name, email, mobile, password_hash, role, gender, dob, profile_image, is_active
       FROM users WHERE email = ? LIMIT 1`,
    [email]
  );
  return rows[0] || null;
}

export async function findUserById(id) {
  const [rows] = await pool.query(
    `SELECT id, full_name, email, mobile, password_hash, role, gender, dob, profile_image, is_active
       FROM users WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

export async function createUser({ full_name, email, mobile, password_hash, role, gender, dob }) {
  const [result] = await pool.query(
    `INSERT INTO users (full_name, email, mobile, password_hash, role, gender, dob)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [full_name, email, mobile || null, password_hash, role, gender || null, dob || null]
  );
  return findUserById(result.insertId);
}

export async function listUsersByRole(role, { limit = 50, offset = 0 } = {}) {
  const [rows] = await pool.query(
    `SELECT ${PUBLIC_FIELDS} FROM users WHERE role = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [role, Number(limit), Number(offset)]
  );
  return rows;
}

export async function updateUser(id, patch) {
  const allowed = ['full_name', 'mobile', 'gender', 'dob', 'is_active', 'profile_image'];
  const fields = [];
  const values = [];
  for (const k of allowed) {
    if (patch[k] !== undefined) {
      fields.push(`${k} = ?`);
      values.push(patch[k]);
    }
  }
  if (!fields.length) return findUserById(id);
  values.push(id);
  await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
  return findUserById(id);
}

export async function deleteUser(id) {
  const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
  return result.affectedRows > 0;
}
