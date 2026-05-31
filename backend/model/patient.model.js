import { pool } from '../config/db.js';

/**
 * Upsert by (email, mobile). Returns the patient row. Used during guest
 * booking — the same patient (same email + mobile) reuses one row across
 * bookings so birthday automation has a stable list of patients.
 */
export async function upsertPatient({ full_name, email, mobile, gender, dob }, conn = pool) {
  await conn.query(
    `INSERT INTO patients (full_name, email, mobile, gender, dob)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       full_name = VALUES(full_name),
       gender    = COALESCE(VALUES(gender), gender),
       dob       = COALESCE(VALUES(dob), dob)`,
    [full_name, email, mobile, gender || null, dob || null]
  );

  const [rows] = await conn.query(
    'SELECT * FROM patients WHERE email = ? AND mobile = ? LIMIT 1',
    [email, mobile]
  );
  return rows[0];
}

export async function findPatientById(id) {
  const [rows] = await pool.query('SELECT * FROM patients WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

export async function listPatients({ search = '', limit = 50, offset = 0 } = {}) {
  const like = `%${search}%`;
  const [rows] = await pool.query(
    `SELECT * FROM patients
      WHERE (? = '' OR full_name LIKE ? OR email LIKE ? OR mobile LIKE ?)
      ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [search, like, like, like, Number(limit), Number(offset)]
  );
  return rows;
}

/**
 * Patient detail view used by the admin Patients page drawer. Returns the
 * patient row enriched with lifetime stats plus full appointment and payment
 * history. Stats are computed in SQL so we don't ship every appointment to
 * the client just to count them.
 */
export async function getPatientFullProfile(id) {
  const [pRows] = await pool.query('SELECT * FROM patients WHERE id = ? LIMIT 1', [id]);
  const patient = pRows[0];
  if (!patient) return null;

  const [[stats]] = await pool.query(
    `SELECT
       COUNT(*) AS total_appointments,
       SUM(appointment_status = 'completed') AS completed_count,
       SUM(appointment_status = 'cancelled') AS cancelled_count,
       SUM(appointment_status = 'no_show')   AS no_show_count,
       SUM(appointment_status = 'pending')   AS pending_count,
       SUM(appointment_status = 'confirmed') AS confirmed_count,
       COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN amount END), 0) AS lifetime_value,
       MIN(appointment_date) AS first_visit,
       MAX(appointment_date) AS last_visit
       FROM appointments
      WHERE patient_id = ?`,
    [id]
  );

  const [appointments] = await pool.query(
    `SELECT a.id, a.appointment_date, a.appointment_time, a.queue_number,
            a.appointment_status, a.payment_status, a.payment_mode,
            a.booking_source, a.amount, a.internal_note,
            a.problem_description, a.created_at,
            s.title AS service_title, s.slug AS service_slug,
            d.name  AS doctor_name
       FROM appointments a
       JOIN services s ON s.id = a.service_id
       LEFT JOIN doctors d ON d.id = a.doctor_id
      WHERE a.patient_id = ?
      ORDER BY a.appointment_date DESC, a.appointment_time DESC, a.id DESC`,
    [id]
  );

  const [payments] = await pool.query(
    `SELECT id, appointment_id, razorpay_order_id, razorpay_payment_id,
            amount, currency, payment_status, payment_method, paid_at, created_at
       FROM payments
      WHERE patient_id = ?
      ORDER BY created_at DESC`,
    [id]
  );

  return {
    patient,
    stats: {
      total_appointments: Number(stats.total_appointments) || 0,
      completed_count:    Number(stats.completed_count)    || 0,
      cancelled_count:    Number(stats.cancelled_count)    || 0,
      no_show_count:      Number(stats.no_show_count)      || 0,
      pending_count:      Number(stats.pending_count)      || 0,
      confirmed_count:    Number(stats.confirmed_count)    || 0,
      lifetime_value:     Number(stats.lifetime_value)     || 0,
      first_visit:        stats.first_visit || null,
      last_visit:         stats.last_visit  || null,
    },
    appointments,
    payments,
  };
}

/**
 * Patients whose DOB's MONTH and DAY match the supplied JS Date.
 * Used by the daily birthday cron — single indexed scan on dob.
 */
export async function findPatientsWithBirthdayOn(date) {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const [rows] = await pool.query(
    `SELECT id, full_name, email, mobile, dob
       FROM patients
      WHERE dob IS NOT NULL
        AND MONTH(dob) = ?
        AND DAY(dob) = ?`,
    [month, day]
  );
  return rows;
}
