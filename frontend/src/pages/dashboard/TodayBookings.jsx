import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../api/axios';
import { formatTime12, formatDateLong, formatINR } from '../../utils/formatters';

import PageHeader from '../../components/dashboard/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import Loader from '../../components/common/Loader';
import NewAppointmentModal from '../../components/dashboard/NewAppointmentModal';
import CancelAppointmentModal from '../../components/dashboard/CancelAppointmentModal';

// 'cancelled' is reached via the Cancel modal (refund flow), not this menu.
// 'completed' is also moved to its own action button below for clarity.
const STATUS_OPTIONS = [
  { value: 'pending',     label: 'Pending' },
  { value: 'confirmed',   label: 'Confirmed' },
  { value: 'no_show',     label: 'No-show' },
  { value: 'rescheduled', label: 'Rescheduled' },
];

const VIEWS = [
  { value: 'active',    label: 'Active queue',     icon: 'fa-list-check' },
  { value: 'completed', label: 'Completed today',  icon: 'fa-circle-check' },
];

/**
 * "Today's Bookings" — flagship dashboard page.
 *
 * Two views:
 *   - 'active': non-completed, non-cancelled bookings for today. Editable.
 *   - 'completed': today's finished bookings. READ-ONLY — no status changes,
 *     no refunds, no cancellation. Once a service is delivered we treat the
 *     record as final to prevent accidental revenue loss.
 */
export default function TodayBookings() {
  const [view, setView] = useState('active');
  const [rows, setRows] = useState([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);

  async function load() {
    try {
      setLoading(true);
      const params = view === 'completed' ? { appointment_status: 'completed' } : {};
      const [main, completed] = await Promise.all([
        api.get('/appointments/today', { params }),
        // Lightweight count for the tab badge — only re-fetched when we refresh.
        view === 'completed'
          ? Promise.resolve({ data: null })
          : api.get('/appointments/today', { params: { appointment_status: 'completed' } }),
      ]);
      setRows(main.data || []);
      if (view === 'completed') {
        setCompletedCount((main.data || []).length);
      } else {
        setCompletedCount((completed.data || []).length);
      }
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load today\'s bookings');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [view]);

  async function updateStatus(id, appointment_status) {
    setBusyId(id);
    try {
      const res = await api.patch(`/appointments/${id}/status`, { appointment_status });
      if (appointment_status === 'completed' || appointment_status === 'cancelled') {
        setRows((cur) => cur.filter((r) => r.id !== id));
        if (appointment_status === 'completed') setCompletedCount((c) => c + 1);
      } else {
        setRows((cur) => cur.map((r) => (r.id === id ? { ...r, ...res.data } : r)));
      }
      toast.success(`Marked ${appointment_status.replace('_', ' ')}`);
    } catch (err) {
      toast.error(err.message || 'Update failed');
    } finally {
      setBusyId(null);
    }
  }

  async function markComplete(id) {
    if (!window.confirm('Mark this booking as completed? Once completed it cannot be re-opened, cancelled or refunded.')) return;
    await updateStatus(id, 'completed');
  }

  async function resend(id) {
    setBusyId(id);
    try {
      await api.post(`/appointments/${id}/resend-confirmation`);
      toast.success('Confirmation email re-sent');
    } catch (err) {
      toast.error(err.message || 'Could not re-send email');
    } finally {
      setBusyId(null);
    }
  }

  const today = formatDateLong(new Date().toISOString().slice(0, 10));
  const isCompletedView = view === 'completed';

  return (
    <>
      <PageHeader
        title="Today's Bookings"
        subtitle={`${today} · first-booked first`}
      >
        {!isCompletedView && (
          <button onClick={() => setShowNew(true)} className="dbtn dbtn-primary">
            <i className="fa-solid fa-plus"></i> New appointment
          </button>
        )}
        <button onClick={load} className="dbtn dbtn-secondary">
          <i className="fa-solid fa-arrows-rotate"></i> Refresh
        </button>
      </PageHeader>

      {/* View tabs */}
      <div className="dash-card p-4 md:p-5 mb-5">
        <div className="flex flex-wrap gap-2">
          {VIEWS.map((v) => {
            const active = view === v.value;
            const badge = v.value === 'completed' ? completedCount : null;
            return (
              <button
                key={v.value}
                type="button"
                onClick={() => setView(v.value)}
                className={`dbtn ${active ? 'dbtn-primary' : 'dbtn-secondary'}`}
              >
                <i className={`fa-solid ${v.icon}`}></i>
                <span className="ml-1">{v.label}</span>
                {badge != null && (
                  <span className={`ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold ${
                    active ? 'bg-white/20 text-white' : 'bg-admin-soft text-admin-deep'
                  }`}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {isCompletedView && (
          <p className="text-xs text-[#6b7385] mt-3">
            <i className="fa-solid fa-lock mr-1"></i>
            Completed bookings are <b>locked</b> — status, refund and cancel actions are disabled to protect revenue.
          </p>
        )}
      </div>

      {loading && <Loader label="Loading queue…" />}

      {!loading && error && (
        <div className="dash-card text-rose-600 text-sm">{error}</div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div className="dash-card dash-empty">
          <i className={`fa-regular ${isCompletedView ? 'fa-circle-check' : 'fa-calendar'}`}></i>
          {isCompletedView
            ? 'No bookings completed yet today.'
            : 'No active appointments for today.'}
          <div className="text-xs mt-1">
            {isCompletedView
              ? 'Bookings will move here once marked complete.'
              : 'New bookings will appear here automatically.'}
          </div>
        </div>
      )}

      <NewAppointmentModal
        open={showNew}
        onClose={() => setShowNew(false)}
        onCreated={load}
      />

      <CancelAppointmentModal
        appointment={cancelTarget}
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onDone={() => setRows((cur) => cur.filter((r) => r.id !== cancelTarget?.id))}
      />

      {!loading && !error && rows.length > 0 && (
        <div className="dash-card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Queue</th>
                  <th>Patient</th>
                  <th>Service</th>
                  <th>Time</th>
                  <th>Source</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id} className={isCompletedView ? 'bg-emerald-50/30' : ''}>
                    <td><span className="queue-badge">#{a.queue_number}</span></td>
                    <td>
                      <div className="font-semibold text-[#1f2230]">{a.patient_name}</div>
                      <div className="text-xs text-[#8a92a6]">{a.patient_mobile}{a.patient_email && !a.patient_email.startsWith('walkin+') ? ` · ${a.patient_email}` : ''}</div>
                    </td>
                    <td>
                      <div className="text-[#2d3142]">{a.service_title}</div>
                      <div className="text-xs text-[#8a92a6]">{a.service_duration} min</div>
                    </td>
                    <td className="text-[#2d3142]">{formatTime12(a.appointment_time)}</td>
                    <td>
                      <StatusBadge value={a.booking_source || 'online'}
                        label={a.booking_source === 'offline' ? 'Walk-in' : 'Online'} />
                      {a.payment_mode === 'cash' && (
                        <span className="ml-1 badge badge-cash">Cash</span>
                      )}
                    </td>
                    <td className="text-[#2d3142] font-semibold">{formatINR(a.amount)}</td>
                    <td><StatusBadge value={a.payment_status} /></td>
                    <td><StatusBadge value={a.appointment_status} /></td>
                    <td>
                      {isCompletedView ? (
                        <div className="flex justify-end items-center gap-2 text-emerald-700 text-xs font-semibold">
                          <i className="fa-solid fa-lock"></i> Locked
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1 flex-wrap">
                          <button
                            className="dbtn dbtn-primary"
                            disabled={busyId === a.id}
                            onClick={() => markComplete(a.id)}
                            title="Mark complete (final — cannot be undone)"
                          >
                            <i className="fa-solid fa-check"></i> Complete
                          </button>
                          <select
                            className="dash-input"
                            style={{ height: 32, padding: '0 8px', fontSize: '0.78rem', width: 130 }}
                            value={a.appointment_status}
                            disabled={busyId === a.id}
                            onChange={(e) => updateStatus(a.id, e.target.value)}
                          >
                            {STATUS_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                          <button
                            className="dbtn dbtn-secondary"
                            disabled={busyId === a.id}
                            onClick={() => resend(a.id)}
                            title="Re-send confirmation email"
                          >
                            <i className="fa-regular fa-envelope"></i>
                          </button>
                          <button
                            className="dbtn dbtn-danger"
                            disabled={busyId === a.id}
                            onClick={() => setCancelTarget(a)}
                            title="Cancel with refund"
                          >
                            <i className="fa-solid fa-ban"></i>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

