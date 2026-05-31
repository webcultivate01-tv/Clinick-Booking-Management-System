import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../api/axios';
import { formatDateLong, formatTime12, formatINR } from '../../utils/formatters';

import PageHeader from '../../components/dashboard/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import Loader from '../../components/common/Loader';
import ExportButtons from '../../components/dashboard/ExportButtons';
import NewAppointmentModal from '../../components/dashboard/NewAppointmentModal';
import CancelAppointmentModal from '../../components/dashboard/CancelAppointmentModal';

const RANGE_TABS = [
  { value: 'all',      label: 'All' },
  { value: 'today',    label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'week',     label: 'This week' },
  { value: 'month',    label: 'This month' },
];

const APPT_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show', 'rescheduled'];
const PAY_STATUSES = ['pending', 'paid', 'failed', 'refunded'];

export default function Appointments() {
  const [filters, setFilters] = useState({
    range: 'all',
    appointment_status: '',
    payment_status: '',
    service_id: '',
    search: '',
  });
  const [rows, setRows] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reschedule, setReschedule] = useState(null); // { id, appointment_date, appointment_time }
  const [busyId, setBusyId] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);

  // Services for the filter dropdown
  useEffect(() => {
    api.get('/services').then((res) => setServices(res.data || [])).catch(() => setServices([]));
  }, []);

  const query = useMemo(() => {
    const q = {};
    Object.entries(filters).forEach(([k, v]) => { if (v) q[k] = v; });
    return q;
  }, [filters]);

  async function load() {
    try {
      setLoading(true);
      const res = await api.get('/appointments', { params: query });
      setRows(res.data || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [query]);

  async function updateStatus(id, appointment_status) {
    setBusyId(id);
    try {
      const res = await api.patch(`/appointments/${id}/status`, { appointment_status });
      setRows((cur) => cur.map((r) => (r.id === id ? { ...r, ...res.data } : r)));
      toast.success('Status updated');
    } catch (err) {
      toast.error(err.message || 'Update failed');
    } finally {
      setBusyId(null);
    }
  }

  async function doReschedule() {
    if (!reschedule?.appointment_date || !reschedule?.appointment_time) {
      toast.error('Pick a date and time');
      return;
    }
    setBusyId(reschedule.id);
    try {
      const res = await api.patch(`/appointments/${reschedule.id}/reschedule`, {
        appointment_date: reschedule.appointment_date,
        appointment_time: reschedule.appointment_time,
      });
      setRows((cur) => cur.map((r) => (r.id === reschedule.id ? { ...r, ...res.data } : r)));
      toast.success('Rescheduled');
      setReschedule(null);
    } catch (err) {
      toast.error(err.message || 'Reschedule failed');
    } finally {
      setBusyId(null);
    }
  }

  const exportColumns = [
    { key: 'queue_number', label: 'Queue #' },
    { key: 'patient_name', label: 'Patient' },
    { key: 'patient_mobile', label: 'Mobile' },
    { key: 'patient_email', label: 'Email' },
    { key: 'service_title', label: 'Service' },
    { label: 'Date', map: (r) => formatDateLong(r.appointment_date) },
    { label: 'Time', map: (r) => formatTime12(r.appointment_time) },
    { label: 'Amount (INR)', map: (r) => (r.amount != null ? Number(r.amount) : '') },
    { key: 'payment_status', label: 'Payment' },
    { key: 'appointment_status', label: 'Status' },
  ];

  const activeFilters = [
    filters.range !== 'all' && `range=${filters.range}`,
    filters.appointment_status && `status=${filters.appointment_status}`,
    filters.payment_status && `payment=${filters.payment_status}`,
    filters.search && `search="${filters.search}"`,
  ].filter(Boolean).join(' · ') || 'no filters';

  return (
    <>
      <PageHeader
        title="Appointments"
        subtitle={`${rows.length} result${rows.length === 1 ? '' : 's'}`}
      >
        <button onClick={() => setShowNew(true)} className="dbtn dbtn-primary">
          <i className="fa-solid fa-plus"></i> New appointment
        </button>
        <ExportButtons
          filename="appointments"
          title="Appointments report"
          subtitle={`${rows.length} record${rows.length === 1 ? '' : 's'} · ${activeFilters}`}
          columns={exportColumns}
          rows={rows}
          dateField="appointment_date"
        />
      </PageHeader>

      <NewAppointmentModal
        open={showNew}
        onClose={() => setShowNew(false)}
        onCreated={load}
      />

      <CancelAppointmentModal
        appointment={cancelTarget}
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onDone={(data) => {
          const updated = data?.appointment;
          if (updated) setRows((cur) => cur.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
        }}
      />

      {/* Filter row */}
      <div className="dash-card p-4 md:p-5 mb-5">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {RANGE_TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setFilters((f) => ({ ...f, range: t.value }))}
              className={`dbtn ${filters.range === t.value ? 'dbtn-primary' : 'dbtn-secondary'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[#6b7385] font-semibold block mb-1">Search</label>
            <input
              className="dash-input"
              placeholder="Name, mobile or email"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[#6b7385] font-semibold block mb-1">Status</label>
            <select
              className="dash-input"
              value={filters.appointment_status}
              onChange={(e) => setFilters((f) => ({ ...f, appointment_status: e.target.value }))}
            >
              <option value="">All statuses</option>
              {APPT_STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[#6b7385] font-semibold block mb-1">Payment</label>
            <select
              className="dash-input"
              value={filters.payment_status}
              onChange={(e) => setFilters((f) => ({ ...f, payment_status: e.target.value }))}
            >
              <option value="">All payments</option>
              {PAY_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[#6b7385] font-semibold block mb-1">Service</label>
            <select
              className="dash-input"
              value={filters.service_id}
              onChange={(e) => setFilters((f) => ({ ...f, service_id: e.target.value }))}
            >
              <option value="">All services</option>
              {services.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading && <Loader label="Loading appointments…" />}
      {!loading && error && <div className="dash-card text-rose-600 text-sm">{error}</div>}

      {!loading && !error && rows.length === 0 && (
        <div className="dash-card dash-empty">
          <i className="fa-regular fa-calendar"></i>
          No appointments match those filters.
        </div>
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="dash-card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Queue</th>
                  <th>Patient</th>
                  <th>Service</th>
                  <th>Date</th>
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
                  <tr key={a.id}>
                    <td><span className="queue-badge">#{a.queue_number ?? '—'}</span></td>
                    <td>
                      <div className="font-semibold text-[#1f2230]">{a.patient_name}</div>
                      <div className="text-xs text-[#8a92a6]">{a.patient_mobile}</div>
                    </td>
                    <td className="text-[#2d3142]">{a.service_title}</td>
                    <td className="text-[#2d3142]">{formatDateLong(a.appointment_date)}</td>
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
                      {a.appointment_status === 'completed' ? (
                        <div className="flex justify-end items-center gap-1 text-emerald-700 text-xs font-semibold">
                          <i className="fa-solid fa-lock"></i> Locked
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1 flex-wrap">
                          <select
                            className="dash-input"
                            style={{ height: 32, padding: '0 8px', fontSize: '0.78rem', width: 140 }}
                            value={a.appointment_status}
                            disabled={busyId === a.id}
                            onChange={(e) => updateStatus(a.id, e.target.value)}
                          >
                            {APPT_STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                          </select>
                          <button
                            className="dbtn dbtn-secondary"
                            onClick={() =>
                              setReschedule({
                                id: a.id,
                                appointment_date: a.appointment_date,
                                appointment_time: a.appointment_time?.slice(0, 5),
                              })
                            }
                            title="Reschedule"
                          >
                            <i className="fa-regular fa-calendar"></i>
                          </button>
                          {a.appointment_status !== 'cancelled' && (
                            <button
                              className="dbtn dbtn-danger"
                              onClick={() => setCancelTarget(a)}
                              title="Cancel with refund"
                            >
                              <i className="fa-solid fa-ban"></i>
                            </button>
                          )}
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

      {/* Reschedule modal */}
      {reschedule && (
        <div className="fixed inset-0 z-50 bg-[#1a1f36]/40 backdrop-blur-sm flex items-center justify-center p-6"
             onClick={() => setReschedule(null)}>
          <div className="dash-card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[#1f2230] mb-1">Reschedule appointment</h3>
            <p className="text-sm text-[#6b7385] mb-4">
              Pick a new date and time. Patient is not notified automatically — please call them.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <input
                type="date"
                className="dash-input"
                value={reschedule.appointment_date}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setReschedule((r) => ({ ...r, appointment_date: e.target.value }))}
              />
              <input
                type="time"
                className="dash-input"
                value={reschedule.appointment_time}
                onChange={(e) => setReschedule((r) => ({ ...r, appointment_time: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button className="dbtn dbtn-secondary" onClick={() => setReschedule(null)}>Cancel</button>
              <button className="dbtn dbtn-primary" disabled={busyId === reschedule.id} onClick={doReschedule}>
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
