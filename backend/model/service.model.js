import { pool } from '../config/db.js';

export async function listServices({ activeOnly = false } = {}) {
  const where = activeOnly ? 'WHERE is_active = 1' : '';
  const [rows] = await pool.query(
    `SELECT * FROM services ${where} ORDER BY title ASC`
  );
  return rows;
}

export async function findServiceById(id) {
  const [rows] = await pool.query('SELECT * FROM services WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

export async function findServiceBySlug(slug) {
  const [rows] = await pool.query('SELECT * FROM services WHERE slug = ? LIMIT 1', [slug]);
  return rows[0] || null;
}

export async function createService(data) {
  const [result] = await pool.query(
    `INSERT INTO services
       (title, slug, description, short_description, price, duration_minutes, image_url, image_public_id, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.title,
      data.slug,
      data.description || null,
      data.short_description || null,
      data.price,
      data.duration_minutes,
      data.image_url || null,
      data.image_public_id || null,
      data.is_active ? 1 : 0,
    ]
  );
  return findServiceById(result.insertId);
}

export async function updateService(id, patch) {
  const allowed = ['title', 'slug', 'description', 'short_description', 'price', 'duration_minutes', 'image_url', 'image_public_id', 'is_active'];
  const fields = [];
  const values = [];
  for (const k of allowed) {
    if (patch[k] !== undefined) {
      fields.push(`${k} = ?`);
      values.push(typeof patch[k] === 'boolean' ? (patch[k] ? 1 : 0) : patch[k]);
    }
  }
  if (!fields.length) return findServiceById(id);
  values.push(id);
  await pool.query(`UPDATE services SET ${fields.join(', ')} WHERE id = ?`, values);
  return findServiceById(id);
}

export async function deleteService(id) {
  const [result] = await pool.query('DELETE FROM services WHERE id = ?', [id]);
  return result.affectedRows > 0;
}
