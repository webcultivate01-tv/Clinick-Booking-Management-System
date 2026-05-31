import { pool } from '../config/db.js';
import {
  getEffectiveSchedule,
  generateSlots,
  normalizeTime,
  timeToMinutes,
} from './opd.model.js';

/**
 * Creates an appointment with a safe per-date queue number.
 *
 * Concurrency model:
 *   - Wraps everything in a transaction.
 *   - Locks all rows for the target appointment_date with `FOR UPDATE`,
 *     preventing two concurrent bookings from computing the same MAX OR
 *     grabbing the same slot. The check-then-insert sequence is therefore
 *     atomic within the transaction.
 *   - On the rare duplicate-key race, retries up to 3 times.
 *   - The UNIQUE(appointment_date, queue_number) constraint is the final
 *     safety net for queue numbers; the explicit slot-collision check is
 *     the safety net for time slots.
 *
 * Returns: { appointmentId, queueNumber }
 */
export async function createAppointmentWithQueue({
  patient_id,
  service_id,
  doctor_id,
  appointment_date,
  appointment_time,
  problem_description,
  amount,
  created_by = null,
  payment_mode = 'online',
  booking_source = 'online',
  appointment_status = 'pending',
  payment_status = 'pending',
}) {
  const MAX_RETRIES = 3;
  const normalizedTime = normalizeTime(appointment_time);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Lock all rows for this date so we can safely:
      //   1) check the slot isn't taken
      //   2) compute MAX(queue_number)
      // both without another transaction racing us.
      const [dayRows] = await conn.query(
        `SELECT queue_number, appointment_time, appointment_status
           FROM appointments
          WHERE appointment_date = ?
          FOR UPDATE`,
        [appointment_date]
      );

      const slotTaken = dayRows.some(
        (r) =>
          normalizeTime(r.appointment_time) === normalizedTime &&
          r.appointment_status !== 'cancelled' &&
          r.appointment_status !== 'no_show'
      );
      if (slotTaken) {
        await conn.rollback();
        const err = new Error('This time slot has just been booked. Please pick another.');
        err.statusCode = 409;
        throw err;
      }

      const maxQueue = dayRows.reduce((m, r) => Math.max(m, Number(r.queue_number) || 0), 0);
      const nextQueue = maxQueue + 1;

      const [result] = await conn.query(
        `INSERT INTO appointments
           (patient_id, service_id, doctor_id, appointment_date, appointment_time,
            queue_number, problem_description, amount,
            appointment_status, payment_status, payment_mode, booking_source, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          patient_id,
          service_id,
          doctor_id || null,
          appointment_date,
          normalizedTime,
          nextQueue,
          problem_description || null,
          amount,
          appointment_status,
          payment_status,
          payment_mode,
          booking_source,
          created_by,
        ]
      );

      await conn.commit();
      return { appointmentId: result.insertId, queueNumber: nextQueue };
    } catch (err) {
      try { await conn.rollback(); } catch (_) { /* already rolled back */ }
      if (err.code === 'ER_DUP_ENTRY' && attempt < MAX_RETRIES) continue;
      throw err;
    } finally {
      conn.release();
    }
  }

  const err = new Error('Could not assign a queue number after multiple attempts');
  err.statusCode = 500;
  throw err;
}

/**
 * Walk-in / counter helper: pick the next unbooked slot on `date`, append to
 * the end of today's queue, and insert. Used by the offline-booking flow so
 * admins don't have to hand-pick a time. All in one transaction, same locking
 * rules as createAppointmentWithQueue.
 *
 * "Next slot" = the first generated slot whose time is >= max(booked time)
 * AND is not booked. If no slots remain on `date`, throws 409.
 */
export async function createWalkinAppointment({
  patient_id,
  service_id,
  doctor_id,
  appointment_date,
  problem_description,
  amount,
  created_by = null,
  payment_mode = 'cash',
  appointment_status = 'confirmed',
  payment_status = 'paid',
}) {
  const schedule = await getEffectiveSchedule(appointment_date);
  if (!schedule.is_open) {
    const err = new Error('Clinic is closed on this date');
    err.statusCode = 409;
    throw err;
  }
  const slots = generateSlots(schedule);
  if (!slots.length) {
    const err = new Error('No OPD slots are configured for this date');
    err.statusCode = 409;
    throw err;
  }

  const MAX_RETRIES = 3;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [dayRows] = await conn.query(
        `SELECT queue_number, appointment_time, appointment_status
           FROM appointments
          WHERE appointment_date = ?
          FOR UPDATE`,
        [appointment_date]
      );

      const takenTimes = new Set(
        dayRows
          .filter((r) => r.appointment_status !== 'cancelled' && r.appointment_status !== 'no_show')
          .map((r) => normalizeTime(r.appointment_time))
      );

      // Anchor = the last active booking's time (so walk-ins always go AFTER
      // the latest appointment). If none yet today, start from earliest slot
      // that hasn't elapsed.
      let anchorMinutes = 0;
      for (const r of dayRows) {
        if (r.appointment_status === 'cancelled' || r.appointment_status === 'no_show') continue;
        const m = timeToMinutes(normalizeTime(r.appointment_time));
        if (m > anchorMinutes) anchorMinutes = m;
      }

      // For today, also skip any slot that's already in the past (IST).
      const today = new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
      let nowMinutesIST = -1;
      if (appointment_date === today) {
        const istNow = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
        nowMinutesIST = istNow.getUTCHours() * 60 + istNow.getUTCMinutes();
      }

      let chosen = null;
      for (const s of slots) {
        const m = timeToMinutes(s);
        if (takenTimes.has(s)) continue;
        if (m <= anchorMinutes && dayRows.length > 0) continue;
        if (m < nowMinutesIST) continue;
        chosen = s;
        break;
      }
      // Fallback: if every slot after the anchor is taken, pick any earlier
      // free slot (rare; only when admin cancels mid-day and re-adds walk-in).
      if (!chosen) {
        for (const s of slots) {
          if (takenTimes.has(s)) continue;
          if (timeToMinutes(s) < nowMinutesIST) continue;
          chosen = s;
          break;
        }
      }
      if (!chosen) {
        await conn.rollback();
        const err = new Error('No free slots left on this date');
        err.statusCode = 409;
        throw err;
      }

      const maxQueue = dayRows.reduce((m, r) => Math.max(m, Number(r.queue_number) || 0), 0);
      const nextQueue = maxQueue + 1;

      const [result] = await conn.query(
        `INSERT INTO appointments
           (patient_id, service_id, doctor_id, appointment_date, appointment_time,
            queue_number, problem_description, amount,
            appointment_status, payment_status, payment_mode, booking_source, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          patient_id,
          service_id,
          doctor_id || null,
          appointment_date,
          chosen,
          nextQueue,
          problem_description || null,
          amount,
          appointment_status,
          payment_status,
          payment_mode,
          'offline',
          created_by,
        ]
      );

      await conn.commit();
      return { appointmentId: result.insertId, queueNumber: nextQueue, appointment_time: chosen };
    } catch (err) {
      try { await conn.rollback(); } catch (_) { /* already rolled back */ }
      if (err.code === 'ER_DUP_ENTRY' && attempt < MAX_RETRIES) continue;
      throw err;
    } finally {
      conn.release();
    }
  }

  const err = new Error('Could not allocate a walk-in slot after multiple attempts');
  err.statusCode = 500;
  throw err;
}

const APPT_JOINED_FIELDS = `
  a.id, a.patient_id, a.service_id, a.doctor_id,
  a.appointment_date, a.appointment_time, a.queue_number,
  a.problem_description, a.appointment_status, a.payment_status,
  a.payment_mode, a.booking_source,
  a.amount, a.internal_note, a.created_at, a.updated_at,
  p.full_name AS patient_name, p.email AS patient_email, p.mobile AS patient_mobile, p.dob AS patient_dob,
  s.title AS service_title, s.slug AS service_slug, s.duration_minutes AS service_duration,
  d.name AS doctor_name
`;

export async function findAppointmentById(id) {
  const [rows] = await pool.query(
    `SELECT ${APPT_JOINED_FIELDS}
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       JOIN services s ON s.id = a.service_id
       LEFT JOIN doctors d ON d.id = a.doctor_id
      WHERE a.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

/**
 * General-purpose list with filters used by both admin and staff dashboards.
 * Filters:
 *   range:           'today' | 'tomorrow' | 'week' | 'month' | 'custom'
 *   from/to:         ISO dates (only used when range='custom' or omitted)
 *   payment_status:  ENUM string
 *   appointment_status: ENUM string
 *   service_id:      number
 *   doctor_id:       number
 *   search:          patient name / email / mobile substring
 *   sort:            'queue' (default for today) | 'date'
 */
export async function listAppointments(filters = {}) {
  const {
    range = 'all',
    from = null,
    to = null,
    payment_status = null,
    appointment_status = null,
    service_id = null,
    doctor_id = null,
    search = '',
    sort = 'date',
    limit = 50,
    offset = 0,
  } = filters;

  const where = [];
  const values = [];

  // Date range filter — server-side in IST. We rely on dateStrings + the
  // pool timezone setting in db.js so MySQL CURDATE() lines up with India.
  if (range === 'today') {
    where.push('a.appointment_date = CURDATE()');
  } else if (range === 'tomorrow') {
    where.push('a.appointment_date = DATE_ADD(CURDATE(), INTERVAL 1 DAY)');
  } else if (range === 'week') {
    where.push('a.appointment_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)');
  } else if (range === 'month') {
    where.push('YEAR(a.appointment_date) = YEAR(CURDATE()) AND MONTH(a.appointment_date) = MONTH(CURDATE())');
  } else if (from && to) {
    where.push('a.appointment_date BETWEEN ? AND ?');
    values.push(from, to);
  } else if (from) {
    where.push('a.appointment_date >= ?');
    values.push(from);
  } else if (to) {
    where.push('a.appointment_date <= ?');
    values.push(to);
  }

  if (payment_status) { where.push('a.payment_status = ?'); values.push(payment_status); }
  if (appointment_status) { where.push('a.appointment_status = ?'); values.push(appointment_status); }
  if (service_id) { where.push('a.service_id = ?'); values.push(Number(service_id)); }
  if (doctor_id) { where.push('a.doctor_id = ?'); values.push(Number(doctor_id)); }
  if (search) {
    where.push('(p.full_name LIKE ? OR p.email LIKE ? OR p.mobile LIKE ?)');
    const like = `%${search}%`;
    values.push(like, like, like);
  }

  // For today's view we sort by queue number (first-booked-first); for other
  // ranges we sort by appointment_date then queue_number.
  const orderBy = sort === 'queue' || range === 'today'
    ? 'a.appointment_date ASC, a.queue_number ASC, a.created_at ASC'
    : 'a.appointment_date ASC, a.queue_number ASC, a.appointment_time ASC';

  const sql = `
    SELECT ${APPT_JOINED_FIELDS}
      FROM appointments a
      JOIN patients p ON p.id = a.patient_id
      JOIN services s ON s.id = a.service_id
      LEFT JOIN doctors d ON d.id = a.doctor_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `;
  values.push(Number(limit), Number(offset));

  const [rows] = await pool.query(sql, values);
  return rows;
}

export async function updateAppointmentStatus(id, { appointment_status, payment_status, internal_note } = {}) {
  const fields = [];
  const values = [];
  if (appointment_status) { fields.push('appointment_status = ?'); values.push(appointment_status); }
  if (payment_status) { fields.push('payment_status = ?'); values.push(payment_status); }
  if (internal_note !== undefined) { fields.push('internal_note = ?'); values.push(internal_note); }
  if (!fields.length) return findAppointmentById(id);
  values.push(id);
  await pool.query(`UPDATE appointments SET ${fields.join(', ')} WHERE id = ?`, values);
  return findAppointmentById(id);
}

export async function rescheduleAppointment(id, { appointment_date, appointment_time }) {
  await pool.query(
    `UPDATE appointments
        SET appointment_date = ?, appointment_time = ?, appointment_status = 'rescheduled'
      WHERE id = ?`,
    [appointment_date, appointment_time, id]
  );
  return findAppointmentById(id);
}

export async function deleteAppointment(id) {
  const [result] = await pool.query('DELETE FROM appointments WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

/** Dashboard quick-stats — counts grouped by status for a given date range. */
export async function getDashboardStats() {
  const [[totals]] = await pool.query(`
    SELECT
      SUM(appointment_date = CURDATE()) AS today_count,
      SUM(appointment_status = 'pending')   AS pending_count,
      SUM(appointment_status = 'confirmed') AS confirmed_count,
      SUM(appointment_status = 'completed') AS completed_count,
      SUM(payment_status = 'paid')          AS paid_count,
      SUM(payment_status = 'pending')       AS pending_payment_count,
      COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN amount END), 0) AS total_revenue
    FROM appointments
  `);
  return totals;
}
