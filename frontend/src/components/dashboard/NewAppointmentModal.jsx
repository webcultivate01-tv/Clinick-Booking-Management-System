import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../api/axios';
import { formatTime12 } from '../../utils/formatters';

const TODAY = new Date().toISOString().slice(0, 10);

const EMPTY = {
  full_name: '',
  email: '',
  mobile: '',
  gender: '',
  dob: '',
  service_id: '',
  appointment_date: TODAY,
  appointment_time: '',
  problem_description: '',
  payment_mode: 'cash',
  auto_slot: true,
};

/**
 * Walk-in / counter booking modal.
 *
 * Two slot modes (controlled by `auto_slot`):
 *   true  — Server picks the next free slot AFTER the latest booked one.
 *           Walk-ins must be cash; payment_mode locks to cash automatically.
 *   false — Admin picks any free slot from the live availability board.
 *           Payment mode is admin's choice (cash or Razorpay).
 *
 * The live board comes from GET /appointments/slots?date=... — same endpoint
 * the public site uses, so booked slots are visually consistent.
 */
export default function NewAppointmentModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY);
  const [services, setServices] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [board, setBoard] = useState(null);
  const [boardLoading, setBoardLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(EMPTY);
    setBoard(null);
    api.get('/services', { params: { active: 'true' } })
      .then((res) => setServices(res.data || []))
      .catch(() => setServices([]));
  }, [open]);

  // Whenever the date changes (or the user switches to manual slot mode),
  // refresh the slot board so the picker matches server reality.
  useEffect(() => {
    if (!open || !form.appointment_date) return;
    let cancelled = false;
    setBoardLoading(true);
    api.get('/appointments/slots', { params: { date: form.appointment_date } })
      .then((res) => { if (!cancelled) setBoard(res.data); })
      .catch(() => { if (!cancelled) setBoard(null); })
      .finally(() => !cancelled && setBoardLoading(false));
    return () => { cancelled = true; };
  }, [open, form.appointment_date]);

  function set(patch) {
    setForm((f) => {
      const next = { ...f, ...patch };
      // Auto-slot walk-ins must be cash — sync the radio if needed.
      if (next.auto_slot && next.payment_mode !== 'cash') next.payment_mode = 'cash';
      // Switching to auto-slot wipes any manually-picked time.
      if (next.auto_slot && !f.auto_slot) next.appointment_time = '';
      return next;
    });
  }

  function openRazorpay(order, patient) {
    return new Promise((resolve, reject) => {
      if (!window.Razorpay) {
        reject(new Error('Razorpay SDK failed to load. Check your internet connection.'));
        return;
      }
      const rzp = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: 'Lumière Skin Clinic',
        description: 'Counter booking',
        order_id: order.id,
        prefill: {
          name: patient.full_name,
          email: patient.email,
          contact: patient.mobile,
        },
        theme: { color: '#5c3d2e' },
        modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
        handler: (response) => resolve(response),
      });
      rzp.on('payment.failed', (r) => reject(new Error(r.error?.description || 'Payment failed')));
      rzp.open();
    });
  }

  const previewSlot = useMemo(() => {
    if (!form.auto_slot || !board?.is_open || !board.slots?.length) return null;
    // Mirror the server's "after latest booking" logic for a friendly preview.
    const lastBookedMins = board.slots
      .filter((s) => s.status === 'booked')
      .map((s) => toMinutes(s.time))
      .reduce((m, v) => Math.max(m, v), -1);
    const candidate = board.slots.find((s) =>
      s.status === 'available' && (lastBookedMins < 0 || toMinutes(s.time) > lastBookedMins)
    ) || board.slots.find((s) => s.status === 'available');
    return candidate?.time || null;
  }, [board, form.auto_slot]);

  async function submit(e) {
    e.preventDefault();
    if (!form.full_name || !form.mobile || !form.service_id || !form.appointment_date) {
      toast.error('Please fill name, mobile, service and date');
      return;
    }
    if (!form.auto_slot && !form.appointment_time) {
      toast.error('Please pick a time slot');
      return;
    }
    setSubmitting(true);
    const t = toast.loading(form.payment_mode === 'cash' ? 'Creating booking…' : 'Creating order…');
    try {
      const payload = {
        full_name: form.full_name.trim(),
        email: form.email.trim() || undefined,
        mobile: form.mobile.trim(),
        gender: form.gender || undefined,
        dob: form.dob || undefined,
        service_id: Number(form.service_id),
        appointment_date: form.appointment_date,
        problem_description: form.problem_description || '',
        payment_mode: form.payment_mode,
        auto_slot: form.auto_slot,
      };
      if (!form.auto_slot) {
        payload.appointment_time = form.appointment_time.length === 5
          ? form.appointment_time + ':00'
          : form.appointment_time;
      }
      const res = await api.post('/appointments/staff-create', payload);
      toast.dismiss(t);

      if (form.auto_slot || form.payment_mode === 'cash') {
        const time = res.data.appointment_time || res.data.appointment?.appointment_time;
        const q = res.data.appointment?.queue_number || res.data.queue_number;
        toast.success(`Confirmed · Queue #${q}${time ? ` · ${formatTime12(time)}` : ''}`);
        onCreated?.();
        onClose();
        return;
      }

      const rp = await openRazorpay(res.data.order, res.data.patient);
      const verifyT = toast.loading('Verifying payment…');
      await api.post('/appointments/verify-payment', {
        razorpay_order_id: rp.razorpay_order_id,
        razorpay_payment_id: rp.razorpay_payment_id,
        razorpay_signature: rp.razorpay_signature,
      });
      toast.dismiss(verifyT);
      toast.success(`Paid · Queue #${res.data.appointment.queue_number}`);
      onCreated?.();
      onClose();
    } catch (err) {
      toast.dismiss(t);
      toast.error(err.message || 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-[#1a1f36]/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="dash-card w-full max-w-2xl my-8"
        onClick={(e) => e.stopPropagation()}
        style={{ padding: '24px' }}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-lg font-semibold text-[#1f2230]">New appointment</h3>
            <p className="text-sm text-[#6b7385]">Walk-in or counter booking. Patient details get saved to records.</p>
          </div>
          <button
            type="button"
            className="dbtn dbtn-secondary"
            onClick={onClose}
            aria-label="Close"
            style={{ padding: '6px 10px' }}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[#6b7385]">Full name *</label>
            <input className="dash-input" value={form.full_name}
              onChange={(e) => set({ full_name: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs text-[#6b7385]">Mobile *</label>
            <input className="dash-input" value={form.mobile} inputMode="numeric" maxLength={10}
              onChange={(e) => set({ mobile: e.target.value.replace(/\D/g, '') })} required
              placeholder="10-digit number" />
          </div>
          <div>
            <label className="text-xs text-[#6b7385]">Email <span className="text-[#aab0bd]">(optional)</span></label>
            <input className="dash-input" type="email" value={form.email}
              onChange={(e) => set({ email: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-[#6b7385]">Date of birth <span className="text-[#aab0bd]">(optional)</span></label>
            <input className="dash-input" type="date" value={form.dob} max={TODAY}
              onChange={(e) => set({ dob: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-[#6b7385]">Gender</label>
            <select className="dash-input" value={form.gender}
              onChange={(e) => set({ gender: e.target.value })}>
              <option value="">—</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-[#6b7385]">Service *</label>
            <select className="dash-input" value={form.service_id}
              onChange={(e) => set({ service_id: e.target.value })} required>
              <option value="">Select service</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.title} — ₹{s.price}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-[#6b7385]">Date *</label>
            <input className="dash-input" type="date" value={form.appointment_date} min={TODAY}
              onChange={(e) => set({ appointment_date: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs text-[#6b7385]">Slot mode *</label>
            <select className="dash-input" value={form.auto_slot ? 'auto' : 'manual'}
              onChange={(e) => set({ auto_slot: e.target.value === 'auto' })}>
              <option value="auto">Auto — next after latest booking</option>
              <option value="manual">Manual — pick any free slot</option>
            </select>
          </div>

          {form.auto_slot && (
            <div className="md:col-span-2 p-3 rounded-xl border border-dash-line bg-[#f8f6f1]">
              {boardLoading && <span className="text-sm text-[#6b7385]">Checking availability…</span>}
              {!boardLoading && board && !board.is_open && (
                <span className="text-sm text-rose-600">
                  <i className="fa-solid fa-circle-exclamation mr-1"></i>
                  {board.note || 'Clinic is closed on this date.'}
                </span>
              )}
              {!boardLoading && board?.is_open && previewSlot && (
                <span className="text-sm text-[#2d3142]">
                  <i className="fa-regular fa-clock mr-1"></i>
                  Will book at <b>{formatTime12(previewSlot)}</b> (next free after the latest booking).
                </span>
              )}
              {!boardLoading && board?.is_open && !previewSlot && (
                <span className="text-sm text-rose-600">
                  <i className="fa-solid fa-circle-exclamation mr-1"></i>
                  No free slots left on this date.
                </span>
              )}
            </div>
          )}

          {!form.auto_slot && (
            <div className="md:col-span-2">
              <label className="text-xs text-[#6b7385] block mb-1">Time *</label>
              {boardLoading && <p className="text-sm text-[#6b7385]">Loading slots…</p>}
              {!boardLoading && board && !board.is_open && (
                <p className="text-sm text-rose-600">{board.note || 'Clinic is closed on this date.'}</p>
              )}
              {!boardLoading && board?.is_open && (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {board.slots.map((s) => {
                    const sel = (form.appointment_time && (form.appointment_time.length === 5
                      ? `${form.appointment_time}:00` : form.appointment_time)) === s.time;
                    const disabled = s.status !== 'available';
                    let cls = 'px-2 py-1.5 text-xs rounded-lg border transition-colors';
                    if (sel) cls += ' border-admin-deep bg-admin-soft text-admin-deep font-semibold';
                    else if (s.status === 'booked') cls += ' border-rose-200 bg-rose-50 text-rose-500 line-through cursor-not-allowed';
                    else if (s.status === 'past') cls += ' border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed';
                    else cls += ' border-dash-line bg-white text-[#2d3142] hover:bg-[#f6f7fb]';
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

          <div className="md:col-span-2">
            <label className="text-xs text-[#6b7385]">Problem / notes</label>
            <textarea className="dash-input" rows={2} value={form.problem_description}
              onChange={(e) => set({ problem_description: e.target.value })} />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs text-[#6b7385] block mb-1">Payment mode *</label>
            <div className="flex gap-2">
              <PayChip active={form.payment_mode === 'cash'} onClick={() => set({ payment_mode: 'cash' })}
                icon="fa-money-bill-wave" label="Cash" hint="Collected at counter" />
              <PayChip active={form.payment_mode === 'online'} onClick={() => !form.auto_slot && set({ payment_mode: 'online' })}
                disabled={form.auto_slot}
                icon="fa-credit-card" label="Online" hint={form.auto_slot ? 'Switch slot mode to Manual to use online' : 'Opens Razorpay'} />
            </div>
          </div>

          <div className="md:col-span-2 flex justify-end gap-2 pt-2 border-t border-dash-line mt-2">
            <button type="button" className="dbtn dbtn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="dbtn dbtn-primary" disabled={submitting}>
              {submitting
                ? 'Please wait…'
                : form.auto_slot
                  ? 'Confirm walk-in (Cash)'
                  : form.payment_mode === 'cash'
                    ? 'Confirm (Cash)'
                    : 'Continue to payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PayChip({ active, onClick, icon, label, hint, disabled }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`flex-1 text-left p-3 rounded-xl border transition ${
        disabled
          ? 'border-dash-line bg-[#f4f5f9] text-[#aab0bd] cursor-not-allowed'
          : active
            ? 'border-admin-deep bg-admin-soft'
            : 'border-dash-line bg-white hover:bg-[#f6f7fb]'
      }`}
    >
      <div className="flex items-center gap-2 font-semibold">
        <i className={`fa-solid ${icon}`}></i> {label}
      </div>
      <div className="text-xs mt-0.5">{hint}</div>
    </button>
  );
}

function toMinutes(t) {
  if (!t) return 0;
  const [h, m] = String(t).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}
