import { pool } from '../config/db.js';

export async function findGalleryItemById(id) {
  const [rows] = await pool.query('SELECT * FROM gallery WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

export async function createGalleryItem({ title, image_url, image_public_id, category }) {
  const [result] = await pool.query(
    `INSERT INTO gallery (title, image_url, image_public_id, category)
     VALUES (?, ?, ?, ?)`,
    [title || null, image_url, image_public_id || null, category || null]
  );
  return findGalleryItemById(result.insertId);
}

export async function listGallery({ activeOnly = false, category = null } = {}) {
  const where = [];
  const values = [];
  if (activeOnly) where.push('is_active = 1');
  if (category) { where.push('category = ?'); values.push(category); }
  const [rows] = await pool.query(
    `SELECT * FROM gallery ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY created_at DESC`,
    values
  );
  return rows;
}

export async function updateGalleryItem(id, patch) {
  const allowed = ['title', 'category', 'is_active'];
  const fields = [];
  const values = [];
  for (const k of allowed) {
    if (patch[k] !== undefined) {
      fields.push(`${k} = ?`);
      values.push(typeof patch[k] === 'boolean' ? (patch[k] ? 1 : 0) : patch[k]);
    }
  }
  if (!fields.length) return findGalleryItemById(id);
  values.push(id);
  await pool.query(`UPDATE gallery SET ${fields.join(', ')} WHERE id = ?`, values);
  return findGalleryItemById(id);
}

export async function deleteGalleryItem(id) {
  const [result] = await pool.query('DELETE FROM gallery WHERE id = ?', [id]);
  return result.affectedRows > 0;
}
