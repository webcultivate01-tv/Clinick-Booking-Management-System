import { useEffect, useState } from 'react';
import { api } from '../../api/axios';
import { todayISO, formatTime12 } from '../../utils/formatters';

/**
 * Public booking slot picker — matches the user-supplied mockup:
 *
 *   - Heading: "Select time of day"
 *   - 4-column grid of slot cards (responsive to 3/4)
 *   - Selected card: gold border + soft gold tint + brown text
 *   - Other cards: light grey border, hover lifts slightly
 *   - Booked / past cards: muted with strikethrough, not clickable
 *
 * Data: GET /appointments/slots?date=YYYY-MM-DD returns the OPD window plus
 * per-slot { time, status } so we can disable booked + past slots.
 */
export default function SlotStep({ form, set, onNext, onBack }) {
  const minDate = todayISO();
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!form.appointment_date) {
      setBoard(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setErr('');
    api
      .get('/appointments/slots', { params: { date: form.appointment_date } })
      .then((res) => {
        if (cancelled) return;
        setBoard(res.data);
        const sel = form.appointment_time;
        if (sel) {
          const norm = sel.length === 5 ? `${sel}:00` : sel;
          const ok = res.data?.slots?.some((s) => s.time === norm && s.status === 'available');
          if (!ok) set({ appointment_time: '' });
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setErr(e.message || 'Could not load slot availability');
        setBoard(null);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.appointment_date]);

  const valid = form.appointment_date && form.appointment_time;
  const selected = form.appointment_time
    ? (form.appointment_time.length === 5 ? `${form.appointment_time}:00` : form.appointment_time)
    : '';

  return (
    <div className="space-y-6">
      <div>
        <label className="label-base">Pick a date<span className="text-rose-500"> *</span></label>
        <input
          type="date"
          className="input-base max-w-xs"
          min={minDate}
          value={form.appointment_date || ''}
          onChange={(e) => set({ appointment_date: e.target.value, appointment_time: '' })}
        />
      </div>

      {form.appointment_date && (
        <div>
          <h3 className="text-lg font-semibold text-charcoal mb-3">Select time of day</h3>

          {loading && <p className="text-sm text-muted">Loading available times…</p>}

          {!loading && err && <p className="text-sm text-rose-600">{err}</p>}

          {!loading && !err && board && !board.is_open && (
            <div className="rounded-2xl border-2 border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              <i className="fa-solid fa-circle-exclamation mr-2"></i>
              {board.note || 'Clinic is closed on this date. Please pick another day.'}
            </div>
          )}

          {!loading && !err && board?.is_open && board.slots.length === 0 && (
            <p className="text-sm text-muted">No slots are available for this date.</p>
          )}

          {!loading && !err && board?.is_open && board.slots.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {board.slots.map((s) => {
                const isSelected = selected === s.time;
                const disabled = s.status !== 'available';
                let cls =
                  'py-3 rounded-xl border-2 text-sm sm:text-base font-semibold transition-colors text-center';
                if (isSelected) {
                  cls += ' border-gold bg-gold/10 text-brown';
                } else if (s.status === 'booked') {
                  cls += ' border-gray-200 bg-gray-50 text-gray-400 line-through cursor-not-allowed';
                } else if (s.status === 'past') {
                  cls += ' border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed';
                } else {
                  cls += ' border-gray-200 bg-white text-charcoal hover:border-gold/60 hover:text-brown';
                }
                return (
                  <button
                    type="button"
                    key={s.time}
                    disabled={disabled}
                    onClick={() => !disabled && set({ appointment_time: s.time })}
                    className={cls}
                  >
                    {formatTime12(s.time)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div>
        <label className="label-base">Anything we should know? (optional)</label>
        <textarea
          rows={3}
          className="input-base"
          placeholder="Describe your concern, allergies, or preferred outcomes"
          value={form.problem_description || ''}
          onChange={(e) => set({ problem_description: e.target.value })}
        />
      </div>

      <div className="flex justify-between pt-2">
        <button className="btn-outline" onClick={onBack}>
          <i className="fa-solid fa-arrow-left mr-2"></i> Back
        </button>
        <button className="btn-primary" disabled={!valid} onClick={onNext}>
          Continue <i className="fa-solid fa-arrow-right ml-2"></i>
        </button>
      </div>
    </div>
  );
}
