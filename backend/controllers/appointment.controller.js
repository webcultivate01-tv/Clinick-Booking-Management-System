import { upsertPatient } from '../model/patient.model.js';
import {
  findAppointmentById,
  listAppointments,
  updateAppointmentStatus,
  rescheduleAppointment,
  deleteAppointment,
  getDashboardStats,
  createAppointmentWithQueue,
  createWalkinAppointment,
} from '../model/appointment.model.js';
import { assertSlotAllowed } from '../model/opd.model.js';
import { findServiceById } from '../model/service.model.js';
import { createOrder, verifySignature, fetchPayment, refundPayment } from '../config/razorpay.js';
import {
  createPaymentRow, markPaymentPaid, markPaymentFailed,
  findPaidPaymentForAppointment, markPaymentRefunded,
} from '../model/payment.model.js';
import { sendAppointmentConfirmation } from '../config/mailer.js';
import { pool } from '../config/db.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_RE = /^[6-9]\d{9}$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const HHMM_RE = /^\d{2}:\d{2}(:\d{2})?$/;

function ensureNotInPast(appointment_date, appointment_time) {
  const t = appointment_time.length === 5 ? `${appointment_time}:00` : appointment_time;
  const slot = new Date(`${appointment_date}T${t}+05:30`);
  if (Number.isNaN(slot.getTime())) {
    const err = new Error('Invalid appointment date/time');
    err.statusCode = 400;
    throw err;
  }
  if (slot.getTime() < Date.now()) {
    const err = new Error('Appointment date/time cannot be in the past');
    err.statusCode = 400;
    throw err;
  }
}

async function ensureNoDuplicate({ email, mobile, appointment_date, appointment_time }) {
  const [rows] = await pool.query(
    `SELECT a.id
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
      WHERE a.appointment_date = ?
        AND a.appointment_time = ?
        AND a.appointment_status NOT IN ('cancelled','no_show')
        AND (p.email = ? OR p.mobile = ?)
      LIMIT 1`,
    [appointment_date, appointment_time, email, mobile]
  );
  if (rows.length) {
    const err = new Error('You already have an appointment at this date and time');
    err.statusCode = 409;
    throw err;
  }
}

/**
 * POST /api/appointments/create-order
 * Public — guest booking. Upserts patient, creates appointment with queue
 * number, then creates a Razorpay order. Payment is not yet verified —
 * /verify-payment finalises it.
 */
export const createOrderForAppointment = async (req, res) => {
  try {
    const {
      full_name, email, mobile, gender, dob,
      service_id, doctor_id,
      appointment_date, appointment_time,
      problem_description = '',
      terms_accepted,
    } = req.body || {};

    if (!full_name || String(full_name).trim().length < 2) {
      return res.status(400).json({ message: 'full_name is required' });
    }
    if (!email || !EMAIL_RE.test(String(email).trim())) {
      return res.status(400).json({ message: 'Invalid email address' });
    }
    if (!mobile || !MOBILE_RE.test(String(mobile).trim())) {
      return res.status(400).json({ message: 'Mobile must be a 10-digit Indian number starting with 6-9' });
    }
    if (!dob || !ISO_DATE_RE.test(String(dob))) {
      return res.status(400).json({ message: 'dob (YYYY-MM-DD) is required' });
    }
    if (!service_id || !Number.isFinite(Number(service_id))) {
      return res.status(400).json({ message: 'service_id is required' });
    }
    if (!appointment_date || !ISO_DATE_RE.test(String(appointment_date))) {
      return res.status(400).json({ message: 'appointment_date (YYYY-MM-DD) is required' });
    }
    if (!appointment_time || !HHMM_RE.test(String(appointment_time))) {
      return res.status(400).json({ message: 'appointment_time (HH:MM) is required' });
    }
    if (terms_accepted !== true) {
      return res.status(400).json({ message: 'You must accept the terms to continue' });
    }

    ensureNotInPast(appointment_date, appointment_time);

    // Validate the slot lines up with the OPD schedule for this date.
    // Throws 400/409 with helpful message if not.
    const { normalized: validatedTime } = await assertSlotAllowed(appointment_date, appointment_time);

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedMobile = String(mobile).trim();

    await ensureNoDuplicate({
      email: normalizedEmail,
      mobile: normalizedMobile,
      appointment_date,
      appointment_time: validatedTime,
    });

    const service = await findServiceById(Number(service_id));
    if (!service || !service.is_active) {
      return res.status(404).json({ message: 'Service not found' });
    }

    const amount = Number(service.price) || Number(process.env.DEFAULT_APPOINTMENT_FEE || 500);

    const patient = await upsertPatient({
      full_name: String(full_name).trim(),
      email: normalizedEmail,
      mobile: normalizedMobile,
      gender,
      dob,
    });

    const { appointmentId, queueNumber } = await createAppointmentWithQueue({
      patient_id: patient.id,
      service_id: Number(service_id),
      doctor_id: doctor_id ? Number(doctor_id) : null,
      appointment_date,
      appointment_time: validatedTime,
      problem_description,
      amount,
    });

    const order = await createOrder({
      amountInRupees: amount,
      receipt: `appt_${appointmentId}`,
      notes: { appointment_id: String(appointmentId), patient_email: normalizedEmail },
    });

    await createPaymentRow({
      appointment_id: appointmentId,
      patient_id: patient.id,
      razorpay_order_id: order.id,
      amount,
      currency: 'INR',
    });

    res.status(201).json({
      data: {
        appointment: { id: appointmentId, queue_number: queueNumber, amount },
        order: {
          id: order.id,
          amount: order.amount,
          currency: order.currency,
          key_id: process.env.RAZORPAY_KEY_ID,
        },
        patient: {
          id: patient.id,
          full_name: patient.full_name,
          email: patient.email,
          mobile: patient.mobile,
        },
      },
      message: 'Order created',
    });
  } catch (err) {
    console.error(err);
    res.status(err.statusCode || 500).json({ message: err.message || 'Server error' });
  }
};

/**
 * POST /api/appointments/verify-payment
 * 1) Verify HMAC signature locally
 * 2) Confirm Razorpay says payment is captured
 * 3) Mark payment paid + appointment confirmed
 * 4) Fire confirmation email (best-effort)
 */
export const verifyAppointmentPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'razorpay_order_id, razorpay_payment_id and razorpay_signature are required' });
    }

    const valid = verifySignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature });
    if (!valid) {
      await markPaymentFailed(razorpay_order_id).catch(() => {});
      return res.status(400).json({ message: 'Payment signature verification failed' });
    }

    const rpPayment = await fetchPayment(razorpay_payment_id);
    if (!rpPayment || (rpPayment.status !== 'captured' && rpPayment.status !== 'authorized')) {
      await markPaymentFailed(razorpay_order_id).catch(() => {});
      return res.status(400).json({ message: `Payment not captured (status: ${rpPayment?.status || 'unknown'})` });
    }

    const [payRows] = await pool.query(
      'SELECT appointment_id FROM payments WHERE razorpay_order_id = ? LIMIT 1',
      [razorpay_order_id]
    );
    if (!payRows.length) {
      return res.status(404).json({ message: 'Payment record not found' });
    }
    const appointmentId = payRows[0].appointment_id;

    await markPaymentPaid({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      payment_method: rpPayment.method,
    });
    await updateAppointmentStatus(appointmentId, {
      appointment_status: 'confirmed',
      payment_status: 'paid',
    });

    const appointment = await findAppointmentById(appointmentId);

    sendAppointmentConfirmation(appointment).catch((e) =>
      console.error('[email] confirmation send failed:', e.message)
    );

    res.status(200).json({ data: { appointment }, message: 'Payment verified, appointment confirmed' });
  } catch (err) {
    console.error(err);
    res.status(err.statusCode || 500).json({ message: err.message || 'Server error' });
  }
};

/**
 * POST /api/appointments/staff-create
 * Dashboard-only walk-in / counter booking. Two operating modes:
 *
 *   1. auto_slot=true  (default for walk-ins)
 *        - Skips appointment_time in the request entirely.
 *        - Server picks the next free slot AFTER the latest active booking
 *          on that date (or the next OPD-grid slot if none yet today).
 *        - payment_mode must be 'cash' in this mode — there's no use case
 *          for paying online when a patient is standing at the counter.
 *
 *   2. auto_slot=false
 *        - Admin supplies appointment_time explicitly (e.g. rescheduling).
 *        - Validates against the OPD schedule and slot grid.
 *        - payment_mode='cash' confirms immediately; 'online' returns a
 *          Razorpay order for the dashboard to open.
 */
export const staffCreateAppointment = async (req, res) => {
  try {
    const {
      full_name, email, mobile, gender, dob,
      service_id, doctor_id,
      appointment_date, appointment_time,
      problem_description = '',
      payment_mode,
      auto_slot,
    } = req.body || {};

    const isAutoSlot = auto_slot === true || auto_slot === 'true';

    if (!full_name || String(full_name).trim().length < 2) {
      return res.status(400).json({ message: 'full_name is required' });
    }
    if (!mobile || !MOBILE_RE.test(String(mobile).trim())) {
      return res.status(400).json({ message: 'Mobile must be a 10-digit Indian number starting with 6-9' });
    }
    if (email && String(email).trim() && !EMAIL_RE.test(String(email).trim())) {
      return res.status(400).json({ message: 'Invalid email address' });
    }
    if (!service_id || !Number.isFinite(Number(service_id))) {
      return res.status(400).json({ message: 'service_id is required' });
    }
    if (!appointment_date || !ISO_DATE_RE.test(String(appointment_date))) {
      return res.status(400).json({ message: 'appointment_date (YYYY-MM-DD) is required' });
    }
    if (!isAutoSlot) {
      if (!appointment_time || !HHMM_RE.test(String(appointment_time))) {
        return res.status(400).json({ message: 'appointment_time (HH:MM) is required when auto_slot is false' });
      }
    }
    if (!['cash', 'online'].includes(payment_mode)) {
      return res.status(400).json({ message: 'payment_mode must be cash or online' });
    }
    if (isAutoSlot && payment_mode !== 'cash') {
      return res.status(400).json({ message: 'Auto-slot walk-ins must use payment_mode=cash' });
    }
    if (dob && !ISO_DATE_RE.test(String(dob))) {
      return res.status(400).json({ message: 'dob must be in YYYY-MM-DD format' });
    }

    let validatedTime = null;
    if (!isAutoSlot) {
      ensureNotInPast(appointment_date, appointment_time);
      ({ normalized: validatedTime } = await assertSlotAllowed(appointment_date, appointment_time));
    }

    const normalizedMobile = String(mobile).trim();
    const effectiveEmail = email && String(email).trim()
      ? String(email).trim().toLowerCase()
      : `walkin+${normalizedMobile}@local.lumiere`;

    if (!isAutoSlot) {
      await ensureNoDuplicate({
        email: effectiveEmail,
        mobile: normalizedMobile,
        appointment_date,
        appointment_time: validatedTime,
      });
    }

    const service = await findServiceById(Number(service_id));
    if (!service || !service.is_active) {
      return res.status(404).json({ message: 'Service not found' });
    }

    const amount = Number(service.price) || Number(process.env.DEFAULT_APPOINTMENT_FEE || 500);

    const patient = await upsertPatient({
      full_name: String(full_name).trim(),
      email: effectiveEmail,
      mobile: normalizedMobile,
      gender,
      dob: dob || null,
    });

    if (isAutoSlot) {
      const walkin = await createWalkinAppointment({
        patient_id: patient.id,
        service_id: Number(service_id),
        doctor_id: doctor_id ? Number(doctor_id) : null,
        appointment_date,
        problem_description,
        amount,
        created_by: req.user?.id || null,
      });
      const appointment = await findAppointmentById(walkin.appointmentId);
      return res.status(201).json({
        data: {
          appointment,
          queue_number: walkin.queueNumber,
          appointment_time: walkin.appointment_time,
        },
        message: `Walk-in confirmed at ${walkin.appointment_time.slice(0, 5)}`,
      });
    }

    const isCash = payment_mode === 'cash';
    const { appointmentId, queueNumber } = await createAppointmentWithQueue({
      patient_id: patient.id,
      service_id: Number(service_id),
      doctor_id: doctor_id ? Number(doctor_id) : null,
      appointment_date,
      appointment_time: validatedTime,
      problem_description,
      amount,
      created_by: req.user?.id || null,
      payment_mode,
      booking_source: 'offline',
      appointment_status: isCash ? 'confirmed' : 'pending',
      payment_status: isCash ? 'paid' : 'pending',
    });

    if (isCash) {
      const appointment = await findAppointmentById(appointmentId);
      return res.status(201).json({
        data: { appointment, queue_number: queueNumber },
        message: 'Walk-in appointment confirmed (cash)',
      });
    }

    const order = await createOrder({
      amountInRupees: amount,
      receipt: `appt_${appointmentId}`,
      notes: {
        appointment_id: String(appointmentId),
        patient_email: effectiveEmail,
        source: 'dashboard',
      },
    });

    await createPaymentRow({
      appointment_id: appointmentId,
      patient_id: patient.id,
      razorpay_order_id: order.id,
      amount,
      currency: 'INR',
    });

    res.status(201).json({
      data: {
        appointment: { id: appointmentId, queue_number: queueNumber, amount },
        order: {
          id: order.id,
          amount: order.amount,
          currency: order.currency,
          key_id: process.env.RAZORPAY_KEY_ID,
        },
        patient: {
          id: patient.id,
          full_name: patient.full_name,
          email: patient.email,
          mobile: patient.mobile,
        },
      },
      message: 'Order created — open Razorpay to collect payment',
    });
  } catch (err) {
    console.error(err);
    res.status(err.statusCode || 500).json({ message: err.message || 'Server error' });
  }
};

/* ----- dashboard endpoints (auth required) ----- */

export const listAll = async (req, res) => {
  try {
    const rows = await listAppointments(req.query);
    res.status(200).json({ data: rows, message: 'OK' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

export const listToday = async (req, res) => {
  try {
    const rows = await listAppointments({ ...req.query, range: 'today', sort: 'queue' });
    // Default "active queue" view: hide completed + cancelled.
    // If the caller explicitly asked for a status (eg ?appointment_status=completed),
    // the model already filtered to that status — don't strip it back out.
    const explicitStatus = !!req.query.appointment_status;
    const filtered = explicitStatus
      ? rows
      : rows.filter((r) => r.appointment_status !== 'completed' && r.appointment_status !== 'cancelled');
    res.status(200).json({ data: filtered, message: 'OK' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

export const getOne = async (req, res) => {
  try {
    const appointment = await findAppointmentById(Number(req.params.id));
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    res.status(200).json({ data: appointment, message: 'OK' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

export const updateStatus = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { appointment_status, payment_status, internal_note } = req.body || {};

    // Completed is terminal — the service was delivered. Re-opening it would
    // let staff hide revenue or re-issue refunds. The only way to undo a
    // completion is a hard DELETE (admin-only), which leaves a clear gap.
    const existing = await findAppointmentById(id);
    if (!existing) return res.status(404).json({ message: 'Appointment not found' });
    if (existing.appointment_status === 'completed' && appointment_status && appointment_status !== 'completed') {
      return res.status(409).json({ message: 'Completed bookings cannot be re-opened' });
    }

    const updated = await updateAppointmentStatus(id, {
      appointment_status,
      payment_status,
      internal_note,
    });
    if (!updated) return res.status(404).json({ message: 'Appointment not found' });
    res.status(200).json({ data: updated, message: 'Appointment updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

export const reschedule = async (req, res) => {
  try {
    const { appointment_date, appointment_time } = req.body || {};
    if (!appointment_date || !appointment_time) {
      return res.status(400).json({ message: 'appointment_date and appointment_time are required' });
    }
    const existing = await findAppointmentById(Number(req.params.id));
    if (!existing) return res.status(404).json({ message: 'Appointment not found' });
    if (existing.appointment_status === 'completed') {
      return res.status(409).json({ message: 'Completed bookings cannot be rescheduled' });
    }
    ensureNotInPast(appointment_date, appointment_time);
    const { normalized } = await assertSlotAllowed(appointment_date, appointment_time);

    // Make sure that target slot isn't already booked by someone else.
    const [busy] = await pool.query(
      `SELECT id FROM appointments
        WHERE appointment_date = ? AND appointment_time = ?
          AND appointment_status NOT IN ('cancelled','no_show')
          AND id <> ?
        LIMIT 1`,
      [appointment_date, normalized, Number(req.params.id)]
    );
    if (busy.length) {
      return res.status(409).json({ message: 'That slot is already booked' });
    }

    const updated = await rescheduleAppointment(Number(req.params.id), {
      appointment_date,
      appointment_time: normalized,
    });
    res.status(200).json({ data: updated, message: 'Appointment rescheduled' });
  } catch (err) {
    console.error(err);
    res.status(err.statusCode || 500).json({ message: err.message || 'Server error' });
  }
};

/**
 * POST /api/appointments/:id/cancel
 * Permanently cancel an appointment.
 *
 * Refund policy:
 *   - body.refund === true and payment_status === 'paid' and payment_mode === 'online':
 *       refund 80% via Razorpay (20% retained as cancellation fee).
 *       `refund_percent` may be overridden in the body (1–100); defaults to 80.
 *   - Cash bookings: no refund processed — admin handles cash return manually
 *     and the response includes a `cash_refund_due` advisory amount.
 *   - Pending payments: no refund needed.
 *
 * The appointment is marked cancelled regardless of refund outcome; if the
 * Razorpay call fails we still cancel and return a partial-failure flag so
 * the admin knows to retry the refund manually from the Razorpay dashboard.
 */
export const cancelAppointment = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const appointment = await findAppointmentById(id);
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    if (appointment.appointment_status === 'cancelled') {
      return res.status(409).json({ message: 'Appointment is already cancelled' });
    }
    if (appointment.appointment_status === 'completed') {
      // Service was already delivered — refusing here forces accidental
      // refund mistakes to require a deliberate admin override (refund
      // directly in the Razorpay dashboard + manual DB note).
      return res.status(409).json({
        message: 'Completed bookings cannot be cancelled or refunded',
      });
    }

    const wantRefund = req.body?.refund === true || req.body?.refund === 'true';
    const refundPercent = Math.min(Math.max(Number(req.body?.refund_percent) || 80, 1), 100);
    const reason = (req.body?.reason || 'Cancelled by clinic').toString().slice(0, 255);

    let refundResult = null;
    let cashRefundDue = null;

    if (wantRefund && appointment.payment_status === 'paid') {
      if (appointment.payment_mode === 'cash') {
        // Cash: we can't push money back through Razorpay. Surface the amount
        // so the receptionist knows what to return at the counter.
        cashRefundDue = Number((Number(appointment.amount) * refundPercent / 100).toFixed(2));
      } else {
        const payment = await findPaidPaymentForAppointment(id);
        if (!payment || !payment.razorpay_payment_id) {
          return res.status(409).json({ message: 'No captured Razorpay payment found for this booking' });
        }
        const refundAmount = Number((Number(payment.amount) * refundPercent / 100).toFixed(2));
        try {
          const rp = await refundPayment({
            razorpay_payment_id: payment.razorpay_payment_id,
            amountInRupees: refundAmount,
            notes: {
              appointment_id: String(id),
              cancellation_fee_percent: String(100 - refundPercent),
              reason,
            },
          });
          await markPaymentRefunded({
            payment_id: payment.id,
            razorpay_refund_id: rp.id,
            refund_amount: refundAmount,
            refund_reason: reason,
          });
          refundResult = { ok: true, refund_id: rp.id, amount: refundAmount, percent: refundPercent };
        } catch (rpErr) {
          console.error('[refund] Razorpay refund failed:', rpErr.message);
          refundResult = {
            ok: false,
            error: rpErr.message || 'Razorpay refund request failed',
            attempted_amount: refundAmount,
            percent: refundPercent,
          };
        }
      }
    }

    const updated = await updateAppointmentStatus(id, {
      appointment_status: 'cancelled',
      internal_note: appointment.internal_note
        ? `${appointment.internal_note}\n[Cancelled ${new Date().toISOString()}] ${reason}`
        : `[Cancelled ${new Date().toISOString()}] ${reason}`,
    });

    res.status(200).json({
      data: {
        appointment: updated,
        refund: refundResult,
        cash_refund_due: cashRefundDue,
        refund_percent: wantRefund ? refundPercent : null,
        cancellation_fee_percent: wantRefund ? 100 - refundPercent : null,
      },
      message: refundResult?.ok
        ? `Cancelled · ₹${refundResult.amount} refunded (${refundPercent}%)`
        : refundResult && !refundResult.ok
          ? 'Cancelled, but refund failed — retry from Razorpay'
          : cashRefundDue
            ? `Cancelled · please return ₹${cashRefundDue} cash at the counter`
            : 'Cancelled',
    });
  } catch (err) {
    console.error(err);
    res.status(err.statusCode || 500).json({ message: err.message || 'Server error' });
  }
};

export const remove = async (req, res) => {
  try {
    const ok = await deleteAppointment(Number(req.params.id));
    if (!ok) return res.status(404).json({ message: 'Appointment not found' });
    res.status(200).json({ data: null, message: 'Appointment deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

export const dashboardStats = async (_req, res) => {
  try {
    const stats = await getDashboardStats();
    res.status(200).json({ data: stats, message: 'OK' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

export const resendConfirmation = async (req, res) => {
  try {
    const appointment = await findAppointmentById(Number(req.params.id));
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    const result = await sendAppointmentConfirmation(appointment);
    if (!result.ok) return res.status(502).json({ message: `Email send failed: ${result.error}` });
    res.status(200).json({ data: null, message: 'Confirmation email re-sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};
