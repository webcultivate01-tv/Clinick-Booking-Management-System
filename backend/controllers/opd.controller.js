import {
  getDefaults, updateDefaults,
  findOverride, upsertOverride, deleteOverride, listOverrides,
  getEffectiveSchedule, generateSlots, getBookedTimes, timeToMinutes,
} from '../model/opd.model.js';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const HHMM_RE = /^\d{2}:\d{2}(:\d{2})?$/;

function validateScheduleBody(body) {
  const errs = [];
  const { start_time, end_time, slot_duration_minutes } = body;
  if (!start_time || !HHMM_RE.test(String(start_time))) errs.push('start_time (HH:MM) is required');
  if (!end_time || !HHMM_RE.test(String(end_time))) errs.push('end_time (HH:MM) is required');
  const dur = Number(slot_duration_minutes);
  if (!Number.isFinite(dur) || dur < 5 || dur > 120) errs.push('slot_duration_minutes must be between 5 and 120');
  if (start_time && end_time && HHMM_RE.test(start_time) && HHMM_RE.test(end_time)) {
    const [sh, sm] = String(start_time).split(':').map(Number);
    const [eh, em] = String(end_time).split(':').map(Number);
    if ((eh * 60 + em) - (sh * 60 + sm) < dur) errs.push('end_time must be at least one slot after start_time');
  }
  return errs;
}

/* ------------------------------ defaults ------------------------------ */

export const getOpdDefaults = async (_req, res) => {
  try {
    const def = await getDefaults();
    res.status(200).json({ data: def, message: 'OK' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

export const updateOpdDefaults = async (req, res) => {
  try {
    const errs = validateScheduleBody(req.body || {});
    if (errs.length) return res.status(400).json({ message: errs.join('; ') });
    const def = await updateDefaults({
      start_time: req.body.start_time.length === 5 ? `${req.body.start_time}:00` : req.body.start_time,
      end_time:   req.body.end_time.length   === 5 ? `${req.body.end_time}:00`   : req.body.end_time,
      slot_duration_minutes: Number(req.body.slot_duration_minutes),
      is_open: req.body.is_open === false ? 0 : 1,
    });
    res.status(200).json({ data: def, message: 'OPD defaults updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

/* ---------------------------- per-day overrides ----------------------- */

export const listOpdSchedules = async (req, res) => {
  try {
    const { from, to } = req.query || {};
    if (from && !ISO_DATE_RE.test(String(from))) return res.status(400).json({ message: 'from must be YYYY-MM-DD' });
    if (to && !ISO_DATE_RE.test(String(to))) return res.status(400).json({ message: 'to must be YYYY-MM-DD' });
    const rows = await listOverrides({ from, to });
    res.status(200).json({ data: rows, message: 'OK' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

export const upsertOpdSchedule = async (req, res) => {
  try {
    const date = String(req.params.date || '');
    if (!ISO_DATE_RE.test(date)) return res.status(400).json({ message: 'Invalid date (use YYYY-MM-DD)' });
    const errs = validateScheduleBody(req.body || {});
    if (errs.length) return res.status(400).json({ message: errs.join('; ') });

    const row = await upsertOverride({
      opd_date: date,
      start_time: req.body.start_time.length === 5 ? `${req.body.start_time}:00` : req.body.start_time,
      end_time:   req.body.end_time.length   === 5 ? `${req.body.end_time}:00`   : req.body.end_time,
      slot_duration_minutes: Number(req.body.slot_duration_minutes),
      is_open: req.body.is_open === false ? 0 : 1,
      note: req.body.note || null,
      created_by: req.user?.id || null,
    });
    res.status(200).json({ data: row, message: 'OPD schedule saved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

export const removeOpdSchedule = async (req, res) => {
  try {
    const date = String(req.params.date || '');
    if (!ISO_DATE_RE.test(date)) return res.status(400).json({ message: 'Invalid date (use YYYY-MM-DD)' });
    const ok = await deleteOverride(date);
    if (!ok) return res.status(404).json({ message: 'No override exists for this date' });
    res.status(200).json({ data: null, message: 'Override removed (defaults will apply)' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

/* ----------------------- public slot board endpoint ------------------- */

/**
 * GET /api/appointments/slots?date=YYYY-MM-DD
 * Public — no auth. Returns the resolved schedule plus the full slot list
 * with a per-slot { time, label, status } where status is one of
 * 'available' | 'booked' | 'past'. Used by the booking wizard.
 */
export const getDaySlots = async (req, res) => {
  try {
    const date = String(req.query.date || '');
    if (!ISO_DATE_RE.test(date)) return res.status(400).json({ message: 'date (YYYY-MM-DD) is required' });

    const schedule = await getEffectiveSchedule(date);
    if (!schedule.is_open) {
      return res.status(200).json({
        data: {
          date,
          is_open: false,
          source: schedule.source,
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          slot_duration_minutes: schedule.slot_duration_minutes,
          slots: [],
          note: schedule.note || 'Clinic is closed on this date.',
        },
        message: 'OK',
      });
    }

    const allSlots = generateSlots(schedule);
    const booked = await getBookedTimes(date);

    // Today: greyout already-elapsed slots so guests can't book in the past.
    const istNow = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const todayIST = istNow.toISOString().slice(0, 10);
    const nowMinutes = date === todayIST
      ? istNow.getUTCHours() * 60 + istNow.getUTCMinutes()
      : -1;

    const slots = allSlots.map((t) => {
      const mins = timeToMinutes(t);
      let status = 'available';
      if (booked.has(t)) status = 'booked';
      else if (mins < nowMinutes) status = 'past';
      return { time: t, status };
    });

    res.status(200).json({
      data: {
        date,
        is_open: true,
        source: schedule.source,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        slot_duration_minutes: schedule.slot_duration_minutes,
        slots,
        note: schedule.note || null,
      },
      message: 'OK',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

/** Helper exposed for the public site — what dates have explicit schedules. */
export const getOpdDay = async (req, res) => {
  try {
    const date = String(req.params.date || '');
    if (!ISO_DATE_RE.test(date)) return res.status(400).json({ message: 'Invalid date (use YYYY-MM-DD)' });
    const schedule = await getEffectiveSchedule(date);
    const override = await findOverride(date);
    res.status(200).json({ data: { schedule, override }, message: 'OK' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};
