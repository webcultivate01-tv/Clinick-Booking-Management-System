import cron from 'node-cron';
import { findPatientsWithBirthdayOn } from '../model/patient.model.js';
import {
  logBirthdaySent,
  logBirthdayFailed,
  hasBirthdayBeenSentToday,
} from '../model/birthdayEmailLog.model.js';
import { sendBirthdayEmail } from '../config/mailer.js';

/**
 * Today's date in Asia/Kolkata regardless of where the server runs.
 */
function todayInIST() {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: process.env.CLINIC_TIMEZONE || 'Asia/Kolkata',
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map(p => [p.type, p.value]));
  const iso = `${parts.year}-${parts.month}-${parts.day}`;
  return { iso, date: new Date(`${iso}T00:00:00+05:30`) };
}

/**
 * Sends birthday emails to every patient whose DOB month+day match today.
 * Skips anyone who already received one today.
 */
export async function runBirthdayJob() {
  const { iso, date } = todayInIST();
  const patients = await findPatientsWithBirthdayOn(date);

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const p of patients) {
    if (!p.email) { skipped += 1; continue; }
    if (await hasBirthdayBeenSentToday(p.id, iso)) { skipped += 1; continue; }

    const result = await sendBirthdayEmail(p);
    if (result.ok) {
      await logBirthdaySent({ patient_id: p.id, email: p.email, sent_date: iso });
      sent += 1;
    } else {
      await logBirthdayFailed({
        patient_id: p.id, email: p.email, sent_date: iso,
        error_message: result.error || 'unknown',
      });
      failed += 1;
    }
  }

  return { date: iso, candidates: patients.length, sent, skipped, failed };
}

/**
 * Schedules the birthday email cron at 09:00 IST every day.
 * Failures inside the job are logged but never propagate — the cron stays
 * alive even if a particular run blows up.
 */
export function startBirthdayCron() {
  const timezone = process.env.CLINIC_TIMEZONE || 'Asia/Kolkata';

  cron.schedule(
    '0 9 * * *',
    async () => {
      try {
        const summary = await runBirthdayJob();
        console.log('[cron][birthday]', summary);
      } catch (err) {
        console.error('[cron][birthday] failed:', err);
      }
    },
    { timezone }
  );

  console.log(`[cron] birthday job scheduled at 09:00 ${timezone}`);
}
