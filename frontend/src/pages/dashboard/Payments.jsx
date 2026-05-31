import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../api/axios';
import PageHeader from '../../components/dashboard/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import Loader from '../../components/common/Loader';
import ExportButtons from '../../components/dashboard/ExportButtons';
import { formatINR } from '../../utils/formatters';

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
];

const METHODS = ['', 'card', 'upi', 'netbanking', 'wallet', 'emi'];

export default function Payments() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    method: '',
    search: '',
    from: '',
    to: '',
  });

  const params = useMemo(() => {
    const q = {};
    Object.entries(filters).forEach(([k, v]) => { if (v) q[k] = v; });
    return q;
  }, [filters]);

  useEffect(() => {
    setLoading(true);
    api.get('/payments', { params })
      .then((res) => setRows(res.data || []))
      .catch((err) => toast.error(err.message || 'Failed to load payments'))
      .finally(() => setLoading(false));
  }, [params]);

  const totals = useMemo(() => {
    const t = { paid: 0, refunded: 0, count: rows.length };
    for (const p of rows) {
      const amt = Number(p.amount) || 0;
      if (p.payment_status === 'paid') t.paid += amt;
      if (p.payment_status === 'refunded') {
        t.refunded += Number(p.refund_amount) || amt;
      }
    }
    return t;
  }, [rows]);

  const exportColumns = [
    { key: 'patient_name', label: 'Patient' },
    { key: 'patient_email', label: 'Email' },
    { key: 'patient_mobile', label: 'Mobile' },
    { key: 'razorpay_order_id', label: 'Order ID' },
    { key: 'razorpay_payment_id', label: 'Payment ID' },
    { label: 'Amount (INR)', map: (r) => (r.amount != null ? Number(r.amount) : '') },
    { label: 'Refund (INR)', map: (r) => (r.refund_amount != null ? Number(r.refund_amount) : '') },
    { key: 'payment_method', label: 'Method' },
    { key: 'payment_status', label: 'Status' },
    { label: 'Paid At', map: (r) => (r.paid_at ? new Date(r.paid_at).toLocaleString('en-IN') : '') },
    { label: 'Refunded At', map: (r) => (r.refunded_at ? new Date(r.refunded_at).toLocaleString('en-IN') : '') },
  ];

  function resetFilters() {
    setFilters({ status: '', method: '', search: '', from: '', to: '' });
  }

  return (
    <>
      <PageHeader title="Payments" subtitle={`${totals.count} transaction${totals.count === 1 ? '' : 's'} · paid ${formatINR(totals.paid)} · refunded ${formatINR(totals.refunded)}`}>
        <ExportButtons
          filename="payments"
          title="Payments report"
          subtitle={`${rows.length} record${rows.length === 1 ? '' : 's'}`}
          columns={exportColumns}
          rows={rows}
          dateField="paid_at"
        />
      </PageHeader>

      {/* Filters */}
      <div className="dash-card p-4 md:p-5 mb-5">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value || 'all'}
              type="button"
              onClick={() => setFilters((f) => ({ ...f, status: t.value }))}
              className={`dbtn ${filters.status === t.value ? 'dbtn-primary' : 'dbtn-secondary'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="md:col-span-2">
            <label className="text-[10px] uppercase tracking-wider text-[#6b7385] font-semibold block mb-1">Search</label>
            <input
              className="dash-input"
              placeholder="Patient, mobile, order or payment ID"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[#6b7385] font-semibold block mb-1">Method</label>
            <select
              className="dash-input"
              value={filters.method}
              onChange={(e) => setFilters((f) => ({ ...f, method: e.target.value }))}
            >
              <option value="">All methods</option>
              {METHODS.filter(Boolean).map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[#6b7385] font-semibold block mb-1">From</label>
            <input
              type="date"
              className="dash-input"
              value={filters.from}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[#6b7385] font-semibold block mb-1">To</label>
            <input
              type="date"
              className="dash-input"
              value={filters.to}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
            />
          </div>
        </div>

        {(filters.search || filters.method || filters.from || filters.to || filters.status) && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <button type="button" onClick={resetFilters} className="dbtn dbtn-secondary">
              <i className="fa-solid fa-xmark"></i> Clear filters
            </button>
          </div>
        )}
      </div>

      {loading && <Loader />}
      {!loading && rows.length === 0 && (
        <div className="dash-card dash-empty">
          <i className="fa-regular fa-credit-card"></i>No payments match these filters.
        </div>
      )}
      {!loading && rows.length > 0 && (
        <div className="dash-card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Razorpay IDs</th>
                  <th>Amount</th>
                  <th>Refund</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="font-semibold text-[#1f2230]">{p.patient_name}</div>
                      <div className="text-xs text-[#8a92a6]">{p.patient_mobile || p.patient_email}</div>
                    </td>
                    <td className="font-mono text-[11px] text-[#4b5063]">
                      <div>{p.razorpay_order_id}</div>
                      {p.razorpay_payment_id && <div className="text-[#8a92a6]">{p.razorpay_payment_id}</div>}
                    </td>
                    <td className="font-semibold text-[#1f2230]">{formatINR(p.amount)}</td>
                    <td>
                      {p.refund_amount ? (
                        <div>
                          <div className="font-semibold text-emerald-700">{formatINR(p.refund_amount)}</div>
                          {p.refund_reason && (
                            <div className="text-[11px] text-[#8a92a6]" title={p.refund_reason}>
                              {p.refund_reason.length > 28 ? p.refund_reason.slice(0, 28) + '…' : p.refund_reason}
                            </div>
                          )}
                        </div>
                      ) : <span className="text-[#aab0bd]">—</span>}
                    </td>
                    <td className="text-[#4b5063]">{p.payment_method || '—'}</td>
                    <td><StatusBadge value={p.payment_status} /></td>
                    <td className="text-[#6b7385] text-xs">
                      {p.refunded_at
                        ? <>Refunded<br/>{new Date(p.refunded_at).toLocaleString('en-IN')}</>
                        : p.paid_at
                          ? new Date(p.paid_at).toLocaleString('en-IN')
                          : new Date(p.created_at).toLocaleString('en-IN')}
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
