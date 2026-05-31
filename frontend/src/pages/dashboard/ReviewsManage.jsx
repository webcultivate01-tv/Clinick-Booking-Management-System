import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../api/axios';
import PageHeader from '../../components/dashboard/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import Loader from '../../components/common/Loader';
import ExportButtons from '../../components/dashboard/ExportButtons';

const STATUSES = ['pending', 'approved', 'rejected'];

export default function ReviewsManage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/reviews', { params: filter ? { status: filter } : {} });
      setRows(res.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  async function setStatus(id, status) {
    setBusyId(id);
    try {
      const res = await api.patch(`/reviews/${id}/status`, { status });
      setRows((cur) => cur.map((r) => (r.id === id ? { ...r, ...res.data } : r)));
      toast.success(`Marked ${status}`);
    } catch (err) { toast.error(err.message || 'Update failed'); }
    finally { setBusyId(null); }
  }

  const exportColumns = [
    { key: 'patient_name', label: 'Patient' },
    { key: 'email',        label: 'Email' },
    { key: 'rating',       label: 'Rating' },
    { key: 'review_text',  label: 'Review' },
    { key: 'status',       label: 'Status' },
    { label: 'Submitted',  map: (r) => (r.created_at ? new Date(r.created_at).toLocaleString('en-IN') : '') },
  ];

  return (
    <>
      <PageHeader title="Reviews" subtitle="Approve or reject patient testimonials before they go public">
        <div className="flex gap-1 flex-wrap">
          <button onClick={() => setFilter('')} className={`dbtn ${!filter ? 'dbtn-primary' : 'dbtn-secondary'}`}>All</button>
          {STATUSES.map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`dbtn ${filter === s ? 'dbtn-primary' : 'dbtn-secondary'}`}>
              {s}
            </button>
          ))}
        </div>
        <ExportButtons
          filename="reviews"
          title="Reviews report"
          subtitle={`${rows.length} review${rows.length === 1 ? '' : 's'}${filter ? ` · ${filter}` : ''}`}
          columns={exportColumns}
          rows={rows}
          dateField="created_at"
        />
      </PageHeader>

      {loading && <Loader />}
      {!loading && rows.length === 0 && (
        <div className="dash-card dash-empty">
          <i className="fa-regular fa-star"></i>No reviews yet.
        </div>
      )}
      {!loading && rows.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rows.map((r) => (
            <article key={r.id} className="dash-card">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-semibold text-[#1f2230]">{r.patient_name}</div>
                  {r.email && <div className="text-xs text-[#8a92a6]">{r.email}</div>}
                </div>
                <StatusBadge value={r.status} />
              </div>
              <div className="text-amber-500 mb-2">
                {Array.from({ length: r.rating }).map((_, i) => (
                  <i key={i} className="fa-solid fa-star text-xs mr-0.5"></i>
                ))}
              </div>
              <p className="text-sm text-[#4b5063] leading-relaxed">{r.review_text}</p>
              <div className="mt-4 flex flex-wrap gap-1">
                {STATUSES.filter((s) => s !== r.status).map((s) => (
                  <button
                    key={s}
                    className="dbtn dbtn-secondary"
                    disabled={busyId === r.id}
                    onClick={() => setStatus(r.id, s)}
                  >
                    Mark {s}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
