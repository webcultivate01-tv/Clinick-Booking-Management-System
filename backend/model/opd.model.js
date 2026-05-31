/**
 * OPD (clinic-hours) model.
 *
 * Resolution rule used everywhere:
 *   - If `opd_schedules` has a row for the date → use it.
 *   - Otherwise → fall back to the singleton `opd_defaults` row.
 *
 * A "slot" is just a HH:MM:SS string anchored to start_time + N * duration.
 * Booked slots are the active appointments for that date whose
 * appointment_status is NOT in ('cancelled','no_show').
 */
import { pool } from '../config/db.js';

const ACTIVE_STATUSES_SQL = `('pending','confirmed','completed','rescheduled')`;

/** Defaults singleton (id=1). Always exists thanks to the schema bootstrap. */
export async function getDefaults(conn = pool) {
  const [rows] = await conn.query(
    `SELECT id, start_time, end_time, slot_duration_minutes, is_open, updated_at
       FROM opd_defaults WHERE id = 1 LIMIT 1`
  );
  return rows[0] || {
    id: 1, start_time: '09:00:00', end_time: '18:00:00',
    slot_duration_minutes: 15, is_open: 1, updated_at: null,
  };
}

export async function updateDefaults({ start_time, end_time, slot_duration_minutes, is_open }) {
  await pool.query(
    `UPDATE opd_defaults
        SET start_time = ?, end_time = ?, slot_duration_minutes = ?, is_open = ?
      WHERE id = 1`,
    [start_time, end_time, slot_duration_minutes, is_open ? 1 : 0]
  );
  return getDefaults();
}

export async function findOverride(date, conn = pool) {
  const [rows] = await conn.query(
    `SELECT id, opd_date, start_time, end_time, slot_duration_minutes, is_open, note,
            created_by, created_at, updated_at
       FROM opd_schedules
      WHERE opd_date = ?
      LIMIT 1`,
    [date]
  );
  return rows[0] || null;
}

/** Effective schedule for `date` — override if any, else defaults projected. */
export async function getEffectiveSchedule(date) {
  const override = await findOverride(date);
  if (override) return { ...override, source: 'override' };
  const def = await getDefaults();
  return {
    opd_date: date,
    start_time: def.start_time,
    end_time: def.end_time,
    slot_duration_minutes: def.slot_duration_minutes,
    is_open: def.is_open,
    note: null,
    source: 'default',
  };
}

export async function upsertOverride({
  opd_date, start_time, end_time, slot_duration_minutes, is_open, note, created_by,
}) {
  await pool.query(
    `INSERT INTO opd_schedules
        (opd_date, start_time, end_time, slot_duration_minutes, is_open, note, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
        start_time = VALUES(start_time),
        end_time = VALUES(end_time),
        slot_duration_minutes = VALUES(slot_duration_minutes),
        is_open = VALUES(is_open),
        note = VALUES(note)`,
    [
      opd_date,
      start_time,
      end_time,
      slot_duration_minutes,
      is_open ? 1 : 0,
      note || null,
      created_by || null,
    ]
  );
  return findOverride(opd_date);
}

export async function deleteOverride(date) {
  const [r] = await pool.query('DELETE FROM opd_schedules WHERE opd_date = ?', [date]);
  return r.affectedRows > 0;
}

export async function listOverrides({ from, to } = {}) {
  const where = [];
  const values = [];
  if (from) { where.push('opd_date >= ?'); values.push(from); }
  if (to)   { where.push('opd_date <= ?'); values.push(to);   }
  const [rows] = await pool.query(
    `SELECT id, opd_date, start_time, end_time, slot_duration_minutes, is_open, note,
            created_by, created_at, updated_at
       FROM opd_schedules
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY opd_date ASC`,
    values
  );
  return rows;
}

/** "HH:MM:SS" → minutes-since-midnight (integer). */
export function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = String(t).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** minutes-since-midnight → "HH:MM:SS". */
export function minutesToTime(min) {
  const m = ((min % (24 * 60)) + 24 * 60) % (24 * 60);
  const hh = String(Math.floor(m / 60)).padStart(2, '0');
  const mm = String(m % 60).padStart(2, '0');
  return `${hh}:${mm}:00`;
}

/** Generate all slot start-times (HH:MM:SS) for an effective schedule. */
export function generateSlots(schedule) {
  if (!schedule || !schedule.is_open) return [];
  const start = timeToMinutes(schedule.start_time);
  const end = timeToMinutes(schedule.end_time);
  const dur = Number(schedule.slot_duration_minutes) || 15;
  const out = [];
  for (let t = start; t + dur <= end; t += dur) out.push(minutesToTime(t));
  return out;
}

/** Fetch active-appointment times for a date (returns Set of "HH:MM:SS"). */
export async function getBookedTimes(date, conn = pool) {
  const [rows] = await conn.query(
    `SELECT appointment_time
       FROM appointments
      WHERE appointment_date = ?
        AND appointment_status NOT IN ('cancelled','no_show')`,
    [date]
  );
  return new Set(rows.map((r) => normalizeTime(r.appointment_time)));
}

/** mysql may return "09:30:00" or "09:30" — coerce to "HH:MM:SS". */
export function normalizeTime(t) {
  if (!t) return '';
  const s = String(t);
  if (s.length === 5) return `${s}:00`;
  return s;
}

/**
 * Validate that `time` is a legal slot for `date`. Throws with statusCode set.
 * - Clinic must be open that day.
 * - Time must fall exactly on a generated slot boundary (no off-grid times).
 */
export async function assertSlotAllowed(date, time) {
  const schedule = await getEffectiveSchedule(date);
  if (!schedule.is_open) {
    const err = new Error('Clinic is closed on this date');
    err.statusCode = 409;
    throw err;
  }
  const slots = generateSlots(schedule);
  const normalized = normalizeTime(time);
  if (!slots.includes(normalized)) {
    const err = new Error('Selected time is not a valid OPD slot for this date');
    err.statusCode = 400;
    throw err;
  }
  return { schedule, normalized };
}

export { ACTIVE_STATUSES_SQL };
