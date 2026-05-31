import bcrypt from 'bcryptjs';
import {
  listUsersByRole,
  findUserById,
  findUserByEmail,
  createUser,
  updateUser,
  deleteUser,
} from '../model/user.model.js';
import { listPatients, getPatientFullProfile } from '../model/patient.model.js';
import { getDashboardStats } from '../model/appointment.model.js';
import { pool } from '../config/db.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_RE = /^[6-9]\d{9}$/;

function safe(u) {
  if (!u) return null;
  const { password_hash, ...rest } = u;
  return rest;
}

export const dashboardStats = async (_req, res) => {
  try {
    const appt = await getDashboardStats();
    const [[counts]] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM enquiries) AS total_enquiries,
        (SELECT COUNT(*) FROM reviews)   AS total_reviews,
        (SELECT COUNT(*) FROM patients)  AS total_patients
    `);
    res.status(200).json({ data: { ...appt, ...counts }, message: 'OK' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

/**
 * Time-series + breakdowns for the dashboard charts. `days` clamped 7..90.
 * Series are zero-filled per day so charts render a continuous X axis.
 */
export const analytics = async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 7), 90);

    const [bookings] = await pool.query(
      `SELECT DATE_FORMAT(appointment_date, '%Y-%m-%d') AS day, COUNT(*) AS count
         FROM appointments
        WHERE appointment_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
          AND appointment_date <= CURDATE()
        GROUP BY appointment_date
        ORDER BY appointment_date ASC`,
      [days - 1]
    );

    const [revenue] = await pool.query(
      `SELECT DATE_FORMAT(a.appointment_date, '%Y-%m-%d') AS day,
              COALESCE(SUM(a.amount), 0) AS revenue
         FROM appointments a
        WHERE a.payment_status = 'paid'
          AND a.appointment_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
          AND a.appointment_date <= CURDATE()
        GROUP BY a.appointment_date
        ORDER BY a.appointment_date ASC`,
      [days - 1]
    );

    const series = [];
    const bMap = Object.fromEntries(bookings.map((r) => [r.day, Number(r.count)]));
    const rMap = Object.fromEntries(revenue.map((r) => [r.day, Number(r.revenue)]));
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      series.push({ day: key, bookings: bMap[key] || 0, revenue: rMap[key] || 0 });
    }

    const [statusRows] = await pool.query(
      `SELECT appointment_status AS status, COUNT(*) AS count
         FROM appointments
        GROUP BY appointment_status`
    );

    const [topServices] = await pool.query(
      `SELECT s.title, COUNT(a.id) AS bookings,
              COALESCE(SUM(CASE WHEN a.payment_status = 'paid' THEN a.amount END), 0) AS revenue
         FROM services s
         LEFT JOIN appointments a ON a.service_id = s.id
        GROUP BY s.id, s.title
       HAVING bookings > 0
        ORDER BY bookings DESC
        LIMIT 6`
    );

    res.status(200).json({
      data: {
        range_days: days,
        series,
        status_breakdown: statusRows.map((r) => ({ status: r.status, count: Number(r.count) })),
        top_services: topServices.map((r) => ({
          title: r.title,
          bookings: Number(r.bookings),
          revenue: Number(r.revenue),
        })),
      },
      message: 'OK',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

export const listAllPatients = async (req, res) => {
  try {
    const rows = await listPatients(req.query);
    res.status(200).json({ data: rows, message: 'OK' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

export const patientDetails = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid patient id' });
    const profile = await getPatientFullProfile(id);
    if (!profile) return res.status(404).json({ message: 'Patient not found' });
    res.status(200).json({ data: profile, message: 'OK' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

/* --------------------------------- staff -------------------------------- */
export const listStaff = async (req, res) => {
  try {
    const rows = await listUsersByRole('staff', req.query);
    res.status(200).json({ data: rows, message: 'OK' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

async function upsertUserAs(req, res, role) {
  const { full_name, email, mobile, password, gender, dob } = req.body || {};

  if (!full_name || String(full_name).trim().length < 2) {
    return res.status(400).json({ message: 'full_name is required' });
  }
  if (!email || !EMAIL_RE.test(String(email).trim())) {
    return res.status(400).json({ message: 'Invalid email address' });
  }
  if (mobile && !MOBILE_RE.test(String(mobile).trim())) {
    return res.status(400).json({ message: 'Mobile must be a 10-digit Indian number starting with 6-9' });
  }
  if (!password || String(password).length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = await findUserByEmail(normalizedEmail);
  if (existing) {
    return res.status(409).json({ message: 'A user with that email already exists' });
  }

  const password_hash = await bcrypt.hash(password, 10);
  const user = await createUser({
    full_name: String(full_name).trim(),
    email: normalizedEmail,
    mobile: mobile ? String(mobile).trim() : null,
    password_hash,
    role,
    gender,
    dob,
  });
  res.status(201).json({ data: safe(user), message: `${role} created` });
}

export const createStaff = async (req, res) => {
  try {
    await upsertUserAs(req, res, 'staff');
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ message: err.message || 'Server error' });
  }
};

export const updateStaff = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const user = await findUserById(id);
    if (!user || user.role !== 'staff') return res.status(404).json({ message: 'Staff user not found' });
    const updated = await updateUser(id, req.body || {});
    res.status(200).json({ data: safe(updated), message: 'Staff updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

export const deleteStaff = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const user = await findUserById(id);
    if (!user || user.role !== 'staff') return res.status(404).json({ message: 'Staff user not found' });
    await deleteUser(id);
    res.status(200).json({ data: null, message: 'Staff removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

/* -------------------------------- admins -------------------------------- */
export const listAdmins = async (req, res) => {
  try {
    const rows = await listUsersByRole('admin', req.query);
    res.status(200).json({ data: rows, message: 'OK' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

export const createAdmin = async (req, res) => {
  try {
    await upsertUserAs(req, res, 'admin');
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ message: err.message || 'Server error' });
  }
};

export const deleteAdmin = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (id === req.user.id) {
      return res.status(400).json({ message: 'You cannot delete your own admin account' });
    }

    const user = await findUserById(id);
    if (!user || user.role !== 'admin') {
      return res.status(404).json({ message: 'Admin user not found' });
    }

    const [[{ remaining }]] = await pool.query(
      "SELECT COUNT(*) AS remaining FROM users WHERE role = 'admin' AND is_active = 1"
    );
    if (Number(remaining) <= 1) {
      return res.status(400).json({ message: 'Cannot delete the last active admin' });
    }

    await deleteUser(id);
    res.status(200).json({ data: null, message: 'Admin removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};
