import { getDashboardStats } from '../model/appointment.model.js';
import { pool } from '../config/db.js';

/**
 * Staff dashboard stats are a strict subset of admin's — no revenue,
 * no patient totals. Keep aligned with the staff sidebar.
 */
export const dashboardStats = async (_req, res) => {
  try {
    const appt = await getDashboardStats();
    const [[counts]] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM enquiries WHERE status = 'new') AS new_enquiries,
        (SELECT COUNT(*) FROM reviews   WHERE status = 'pending') AS pending_reviews
    `);

    const safe = {
      today_count: appt.today_count,
      pending_count: appt.pending_count,
      confirmed_count: appt.confirmed_count,
      completed_count: appt.completed_count,
      ...counts,
    };
    res.status(200).json({ data: safe, message: 'OK' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};
