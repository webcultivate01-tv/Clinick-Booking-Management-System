import { pool } from '../config/db.js';

export async function createPaymentRow({ appointment_id, patient_id, razorpay_order_id, amount, currency = 'INR' }, conn = pool) {
  const [result] = await conn.query(
    `INSERT INTO payments
       (appointment_id, patient_id, razorpay_order_id, amount, currency, payment_status)
     VALUES (?, ?, ?, ?, ?, 'pending')`,
    [appointment_id, patient_id, razorpay_order_id, amount, currency]
  );
  return result.insertId;
}

export async function markPaymentPaid({ razorpay_order_id, razorpay_payment_id, razorpay_signature, payment_method }) {
  await pool.query(
    `UPDATE payments
        SET razorpay_payment_id = ?,
            razorpay_signature  = ?,
            payment_method      = ?,
            payment_status      = 'paid',
            paid_at             = CURRENT_TIMESTAMP
      WHERE razorpay_order_id = ?`,
    [razorpay_payment_id, razorpay_signature, payment_method || null, razorpay_order_id]
  );
}

export async function markPaymentFailed(razorpay_order_id) {
  await pool.query(
    `UPDATE payments SET payment_status = 'failed' WHERE razorpay_order_id = ?`,
    [razorpay_order_id]
  );
}

export async function findPaymentByOrderId(razorpay_order_id) {
  const [rows] = await pool.query('SELECT * FROM payments WHERE razorpay_order_id = ? LIMIT 1', [razorpay_order_id]);
  return rows[0] || null;
}

export async function listPayments({
  status = null,
  method = null,
  search = '',
  from = null,
  to = null,
  limit = 100,
  offset = 0,
} = {}) {
  const where = [];
  const values = [];
  if (status) { where.push('pay.payment_status = ?'); values.push(status); }
  if (method) { where.push('pay.payment_method = ?'); values.push(method); }
  if (from) { where.push('DATE(pay.created_at) >= ?'); values.push(from); }
  if (to)   { where.push('DATE(pay.created_at) <= ?'); values.push(to); }
  if (search) {
    where.push('(p.full_name LIKE ? OR p.email LIKE ? OR p.mobile LIKE ? OR pay.razorpay_order_id LIKE ? OR pay.razorpay_payment_id LIKE ?)');
    const like = `%${search}%`;
    values.push(like, like, like, like, like);
  }
  values.push(Number(limit), Number(offset));

  const [rows] = await pool.query(
    `SELECT pay.*, p.full_name AS patient_name, p.email AS patient_email, p.mobile AS patient_mobile
       FROM payments pay
       JOIN patients p ON p.id = pay.patient_id
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY pay.created_at DESC
     LIMIT ? OFFSET ?`,
    values
  );
  return rows;
}

/**
 * Find the latest paid payment for an appointment. Used by the refund flow:
 * patients may have multiple attempts (retry after failure) but at most one
 * should be `paid` — we return that one.
 */
export async function findPaidPaymentForAppointment(appointment_id) {
  const [rows] = await pool.query(
    `SELECT * FROM payments
      WHERE appointment_id = ? AND payment_status = 'paid'
      ORDER BY paid_at DESC, id DESC
      LIMIT 1`,
    [appointment_id]
  );
  return rows[0] || null;
}

/**
 * Mark a payment as refunded. `refund_amount` may be less than the original
 * amount (partial refund — e.g. 80% cancellation policy).
 */
export async function markPaymentRefunded({
  payment_id, razorpay_refund_id, refund_amount, refund_reason,
}) {
  await pool.query(
    `UPDATE payments
        SET razorpay_refund_id = ?,
            refund_amount      = ?,
            refund_reason      = ?,
            refunded_at        = CURRENT_TIMESTAMP,
            payment_status     = 'refunded'
      WHERE id = ?`,
    [razorpay_refund_id, refund_amount, refund_reason || null, payment_id]
  );
}
