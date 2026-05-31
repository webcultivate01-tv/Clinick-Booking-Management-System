import nodemailer from 'nodemailer';

let _transporter = null;

/**
 * Lazy singleton transporter. We don't fail boot if SMTP is not configured —
 * the email helpers handle missing config gracefully and log the skip.
 */
export function getTransporter() {
  if (_transporter) return _transporter;

  const {
    EMAIL_HOST,
    EMAIL_PORT,
    EMAIL_USER,
    EMAIL_PASS,
    EMAIL_SECURE,
  } = process.env;

  if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) {
    return null;
  }

  _transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: Number(EMAIL_PORT || 587),
    secure: EMAIL_SECURE === 'true', // true for port 465; false for 587 (STARTTLS)
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });

  return _transporter;
}

const CLINIC_NAME    = () => process.env.CLINIC_NAME || 'Lumière Skin Clinic';
const CLINIC_ADDRESS = () => process.env.CLINIC_ADDRESS || '';
const CLINIC_PHONE   = () => process.env.CLINIC_PHONE || '';
const FROM_ADDRESS   = () => process.env.EMAIL_FROM || `${CLINIC_NAME()} <no-reply@example.com>`;

/**
 * Low-level send. Swallows errors and returns { ok, error } so callers
 * (the booking flow, the cron) can decide whether to surface them — a
 * failed email should never abort a successful appointment.
 */
export async function sendMail({ to, subject, html, text }) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn('[mailer] SMTP not configured — skipping email to', to);
    return { ok: false, error: 'smtp_not_configured' };
  }
  try {
    const info = await transporter.sendMail({
      from: FROM_ADDRESS(),
      to,
      subject,
      html,
      text,
    });
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    console.error('[mailer] send failed:', err.message);
    return { ok: false, error: err.message };
  }
}

/** Branded HTML wrapper that matches the website's cream/gold palette. */
function shell(title, bodyHtml) {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#faf7f2;font-family:Inter,Arial,sans-serif;color:#2c2420;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#faf7f2;">
    <tr><td align="center" style="padding:32px 12px;">
      <table cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 6px 30px rgba(80,40,20,0.08);">
        <tr><td style="background:#5c3d2e;padding:22px 28px;color:#faf7f2;font-family:'Playfair Display',Georgia,serif;font-size:22px;">
          ${CLINIC_NAME()}
        </td></tr>
        <tr><td style="padding:28px;">
          <h2 style="font-family:'Playfair Display',Georgia,serif;color:#5c3d2e;margin:0 0 16px;font-size:22px;">${title}</h2>
          ${bodyHtml}
        </td></tr>
        <tr><td style="background:#faf7f2;padding:18px 28px;color:#8a7a70;font-size:12px;line-height:1.6;border-top:1px solid #e8d5b7;">
          ${CLINIC_ADDRESS()}<br/>
          ${CLINIC_PHONE() ? 'Call: ' + CLINIC_PHONE() : ''}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function formatDate(iso) {
  // 'YYYY-MM-DD' → 'Wed, 20 May 2026'
  const d = new Date(`${iso}T00:00:00+05:30`);
  return d.toLocaleDateString('en-IN', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatTime(hhmmss) {
  if (!hhmmss) return '';
  const [h, m] = hhmmss.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hr12 = ((h + 11) % 12) + 1;
  return `${hr12}:${String(m).padStart(2, '0')} ${period}`;
}

function escapeHtml(s = '') {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export async function sendAppointmentConfirmation(appointment) {
  const body = `
    <p>Dear ${escapeHtml(appointment.patient_name)},</p>
    <p>Your appointment at <strong>${CLINIC_NAME()}</strong> has been confirmed. Details below:</p>
    <table cellspacing="0" cellpadding="8" style="margin:14px 0;border-collapse:collapse;font-size:14px;">
      <tr><td style="color:#8a7a70;">Queue Number</td>
          <td><strong style="color:#5c3d2e;font-size:18px;">#${appointment.queue_number}</strong></td></tr>
      <tr><td style="color:#8a7a70;">Service</td><td>${escapeHtml(appointment.service_title)}</td></tr>
      <tr><td style="color:#8a7a70;">Date</td><td>${formatDate(appointment.appointment_date)}</td></tr>
      <tr><td style="color:#8a7a70;">Time</td><td>${formatTime(appointment.appointment_time)}</td></tr>
      <tr><td style="color:#8a7a70;">Payment</td>
          <td><span style="background:#e6f4ea;color:#1e7a3a;padding:3px 10px;border-radius:999px;font-size:12px;">PAID</span></td></tr>
    </table>
    <p>Please arrive 10 minutes before your scheduled time. If you wish to reschedule, reply to this email or call us.</p>
    <p style="margin-top:24px;">Warm regards,<br/>${CLINIC_NAME()}</p>
  `;
  return sendMail({
    to: appointment.patient_email,
    subject: `Appointment confirmed — Queue #${appointment.queue_number} on ${formatDate(appointment.appointment_date)}`,
    html: shell('Appointment Confirmed', body),
    text:
      `Dear ${appointment.patient_name},\n\n` +
      `Your appointment is confirmed.\n` +
      `Queue: #${appointment.queue_number}\n` +
      `Service: ${appointment.service_title}\n` +
      `Date: ${appointment.appointment_date}\n` +
      `Time: ${appointment.appointment_time}\n\n` +
      `— ${CLINIC_NAME()}`,
  });
}

export async function sendBirthdayEmail(patient) {
  const body = `
    <p>Dear ${escapeHtml(patient.full_name)},</p>
    <p>Wishing you a very <strong>Happy Birthday</strong> from all of us at ${CLINIC_NAME()}! 🎉</p>
    <p>May your year ahead be glowing, healthy and beautiful. As a small thank-you for being part of our family, you can mention this email at your next visit for a complimentary skin consultation.</p>
    <p style="margin-top:24px;">With warm wishes,<br/>${CLINIC_NAME()}</p>
  `;
  return sendMail({
    to: patient.email,
    subject: `Happy Birthday from ${CLINIC_NAME()} 🎂`,
    html: shell('Happy Birthday!', body),
    text: `Happy Birthday, ${patient.full_name}! — ${CLINIC_NAME()}`,
  });
}
