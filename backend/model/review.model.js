import { pool } from '../config/db.js';

export async function findReviewById(id) {
  const [rows] = await pool.query('SELECT * FROM reviews WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

export async function createReview(data) {
  const [result] = await pool.query(
    `INSERT INTO reviews (patient_name, email, rating, review_text)
     VALUES (?, ?, ?, ?)`,
    [data.patient_name, data.email || null, data.rating, data.review_text]
  );
  return findReviewById(result.insertId);
}

export async function listReviews({ status = null, limit = 50, offset = 0 } = {}) {
  const where = status ? 'WHERE status = ?' : '';
  const values = status ? [status] : [];
  values.push(Number(limit), Number(offset));
  const [rows] = await pool.query(
    `SELECT * FROM reviews ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    values
  );
  return rows;
}

export async function updateReviewStatus(id, status) {
  await pool.query('UPDATE reviews SET status = ? WHERE id = ?', [status, id]);
  return findReviewById(id);
}

export async function deleteReview(id) {
  const [result] = await pool.query('DELETE FROM reviews WHERE id = ?', [id]);
  return result.affectedRows > 0;
}
