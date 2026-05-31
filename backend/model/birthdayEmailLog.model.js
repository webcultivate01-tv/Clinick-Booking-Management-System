import { pool } from '../config/db.js';

/**
 * Insert IGNORE so the UNIQUE(patient_id, sent_date) constraint silently
 * skips duplicates — that's how we guarantee at most one birthday email
 * per patient per day even if the cron runs twice.
 */
export async function logBirthdaySent({ patient_id, email, sent_date }) {
  await pool.query(
    `INSERT IGNORE INTO birthday_email_logs (patient_id, email, sent_date, status)
     VALUES (?, ?, ?, 'sent')`,
    [patient_id, email, sent_date]
  );
}

export async function logBirthdayFailed({ patient_id, email, sent_date, error_message }) {
  await pool.query(
    `INSERT INTO birthday_email_logs (patient_id, email, sent_date, status, error_message)
     VALUES (?, ?, ?, 'failed', ?)
     ON DUPLICATE KEY UPDATE status = 'failed', error_message = VALUES(error_message)`,
    [patient_id, email, sent_date, error_message]
  );
}

export async function hasBirthdayBeenSentToday(patient_id, sent_date) {
  const [rows] = await pool.query(
    `SELECT 1 FROM birthday_email_logs
      WHERE patient_id = ? AND sent_date = ? AND status = 'sent' LIMIT 1`,
    [patient_id, sent_date]
  );
  return rows.length > 0;
}
