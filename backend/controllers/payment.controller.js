import { listPayments } from '../model/payment.model.js';
import { pool } from '../config/db.js';

export const list = async (req, res) => {
  try {
    const rows = await listPayments(req.query);
    res.status(200).json({ data: rows, message: 'OK' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

export const getOne = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT pay.*, p.full_name AS patient_name, p.email AS patient_email
         FROM payments pay JOIN patients p ON p.id = pay.patient_id
        WHERE pay.id = ? LIMIT 1`,
      [Number(req.params.id)]
    );
    if (!rows.length) return res.status(404).json({ message: 'Payment not found' });
    res.status(200).json({ data: rows[0], message: 'OK' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};
