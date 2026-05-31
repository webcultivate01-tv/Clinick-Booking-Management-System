import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  FiSearch, FiX, FiRefreshCw, FiFilter, FiChevronUp, FiChevronDown,
  FiMessageSquare, FiClock, FiAlertOctagon, FiCheckCircle, FiSend,
  FiMessageCircle, FiMail, FiEye, FiInbox, FiTrash2, FiFlag,
} from 'react-icons/fi';
import { api } from '../../api/axios';
import PageHeader from '../../components/dashboard/PageHeader';
import StatCard from '../../components/dashboard/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import ExportButtons from '../../components/dashboard/ExportButtons';
import { SkeletonRow } from '../../components/dashboard/Skeleton';
import EnquiryDetailsDrawer, {
  isOverdue, waitedSince, waUrl,
} from '../../components/dashboard/EnquiryDetailsDrawer';

/* ---------------------------------------------------------------- */
/*  Filter constants                                                 */
/* ---------------------------------------------------------------- */

const STATUS_OPTIONS = [
  { value: '',           label: 'All statuses' },
  { value: 'new',        label: 'New' },
  { value: 'contacted',  label: 'Contacted' },
  { value: 'closed',     label: 'Closed' },
];

const PRIORITY_OPTIONS = [
  { value: '',        label: 'All priorities' },
  { value: 'urgent',  label: 'Urgent' },
  { value: 'high',    label: 'High' },
  { value: 'normal',  label: 'Normal' },
  { value: 'low',     label: 'Low' },
];

const SORT_OPTIONS = [
  { value: 'newest',   label: 'Newest first' },
  { value: 'oldest',   label: 'Oldest first' },
  { value: 'priority', label: 'Priority (urgent first)' },
];

const QUICK_RANGES = [
  { value: '',     label: 'All time' },
  { value: '24h',  label: 'Last 24 hours' },
  { value: '7d',   label: 'Last 7 days' },
  { value: '30d',  label: 'Last 30 days' },
];

const PRIORITY_TONES = {
  urgent: 'bg-red-50 text-red-700 border-red-200',
  high:   'bg-amber-50 text-amber-700 border-amber-200',
  normal: 'bg-slate-50 text-slate-600 border-slate-200',
  low:    'bg-slate-50 text-slate-500 border-slate-200',
};

/* ---------------------------------------------------------------- */
/*  Page                                                             */
/* ---------------------------------------------------------------- */

export default function Enquiries() {
  const [rows, setRows]         = useState([]);
  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(true);

  // Filters
  const [search, setSearch]     = useState('');
  const [status, setStatus]     = useState('');
  const [priority, setPriority] = useState('');
  const [range, setRange]       = useState('');
  const [sort, setSort]         = useState('newest');

  // Triage / drawer
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [drawerId, setDrawerId]       = useState(null);
  const [bulkBusy, setBulkBusy]       = useState(false);

  // Build query params for the server.
  const params = useMemo(() => {
    const p = {};
    if (status)   p.status   = status;
    if (priority) p.priority = priority;
    if (search)   p.search   = search;
    if (sort)     p.sort     = sort;
    if (range) {
      const days = range === '24h' ? 1 : range === '7d' ? 7 : range === '30d' ? 30 : null;
      if (days) {
        const from = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
        p.from = from;
      }
    }
    return p;
  }, [status, priority, search, sort, range]);

  const fetchRows = useCallback(() => {
    setLoading(true);
    api.get('/enquiries', { params })
      .then((res) => setRows(res.data || []))
      .catch((err) => toast.error(err.message || 'Failed to load enquiries'))
      .finally(() => setLoading(false));
  }, [params]);

  const fetchStats = useCallback(() => {
    api.get('/enquiries/stats')
      .then((res) => setStats(res.data || null))
      .catch(() => {});
  }, []);

  // Debounce only the search input; everything else triggers immediately.
  useEffect(() => {
    const t = setTimeout(fetchRows, search ? 250 : 0);
    return () => clearTimeout(t);
  }, [fetchRows, search]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // Clear stale selections whenever the row set changes.
  useEffect(() => { setSelectedIds(new Set()); }, [rows]);

  /* -------- Bulk actions -------- */

  const visibleIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(visibleIds));
  };
  const toggleOne = (id) => {
    setSelectedIds((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  async function bulkSetStatus(newStatus) {
    if (!selectedIds.size) return;
    setBulkBusy(true);
    try {
      const ids = Array.from(selectedIds);
      await api.post('/enquiries/bulk/status', { ids, status: newStatus });
      toast.success(`Marked ${ids.length} as ${newStatus}`);
      setSelectedIds(new Set());
      fetchRows(); fetchStats();
    } catch (err) { toast.error(err.message || 'Bulk update failed'); }
    finally { setBulkBusy(false); }
  }

  async function bulkRemove() {
    if (!selectedIds.size) return;
    if (!confirm(`Delete ${selectedIds.size} enquir${selectedIds.size === 1 ? 'y' : 'ies'} permanently?`)) return;
    setBulkBusy(true);
    try {
      const ids = Array.from(selectedIds);
      await api.post('/enquiries/bulk/delete', { ids });
      toast.success(`Deleted ${ids.length}`);
      setSelectedIds(new Set());
      fetchRows(); fetchStats();
    } catch (err) { toast.error(err.message || 'Bulk delete failed'); }
    finally { setBulkBusy(false); }
  }

  /* -------- Filter reset -------- */
  const hasActiveFilters = !!(search || status || priority || range || sort !== 'newest');
  const reset = () => { setSearch(''); setStatus(''); setPriority(''); setRange(''); setSort('newest'); };

  /* -------- Export columns -------- */
  const exportColumns = [
    { key: 'name',    label: 'Name' },
    { key: 'email',   label: 'Email' },
    { key: 'mobile',  label: 'Mobile' },
    { key: 'subject', label: 'Subject' },
    { key: 'priority', label: 'Priority' },
    { key: 'status',  label: 'Status' },
    { label: 'Received', map: (r) => (r.created_at ? new Date(r.created_at).toLocaleString('en-IN') : '') },
    { label: 'Responded', map: (r) => (r.responded_at ? new Date(r.responded_at).toLocaleString('en-IN') : '') },
    { key: 'internal_note', label: 'Internal note' },
    { key: 'message', label: 'Message' },
  ];

  /* -------- Avg response (humanized) -------- */
  const avgResponse = useMemo(() => {
    if (!stats?.avg_response_minutes) return '—';
    const m = stats.avg_response_minutes;
    if (m < 60) return `${m}m`;
    if (m < 60 * 24) return `${(m / 60).toFixed(1)}h`;
    return `${(m / (60 * 24)).toFixed(1)}d`;
  }, [stats]);

  return (
    <div className="space-y-6">
      {/* 6.1 Page header */}
      <PageHeader
        title="Enquiries"
        subtitle={`${rows.length} matching${stats ? ` of ${stats.total} total` : ''} · Inbound contact-form messages`}
      >
        <button
          type="button"
          onClick={() => { fetchRows(); fetchStats(); }}
          className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-600 bg-white border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <FiRefreshCw className="text-[14px]" /> Refresh
        </button>
        <ExportButtons
          filename="enquiries"
          title="Enquiries report"
          subtitle={`${rows.length} enquir${rows.length === 1 ? 'y' : 'ies'}${status ? ` · ${status}` : ''}${priority ? ` · ${priority}` : ''}`}
          columns={exportColumns}
          rows={rows}
          dateField="created_at"
        />
      </PageHeader>

      {/* 6.2 Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          accent="blue" iconNode={<FiMessageSquare className="text-base" />}
          label="Total" value={stats?.total ?? '—'}
          trend={stats?.last_24h_count > 0 ? `+${stats.last_24h_count} today` : undefined}
        />
        <StatCard
          accent="amber" iconNode={<FiClock className="text-base" />}
          label="New / Awaiting reply" value={stats?.new_count ?? '—'}
          trend={stats?.overdue_count > 0 ? `${stats.overdue_count} overdue` : undefined}
          trendTone={stats?.overdue_count > 0 ? 'rose' : 'emerald'}
        />
        <StatCard
          accent="emerald" iconNode={<FiCheckCircle className="text-base" />}
          label="Avg. response time" value={avgResponse}
        />
        <StatCard
          accent="indigo" iconNode={<FiAlertOctagon className="text-base" />}
          label="Urgent / High" value={`${stats?.urgent_count ?? 0} / ${stats?.high_count ?? 0}`}
        />
      </div>

      {/* 6.3 Filter bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Search</label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[14px]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, mobile, subject or message…"
                className="w-full pl-9 pr-9 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 w-5 h-5 rounded flex items-center justify-center"
                  aria-label="Clear search"
                >
                  <FiX className="text-[12px]" />
                </button>
              )}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white">
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white">
              {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Received</label>
            <select value={range} onChange={(e) => setRange(e.target.value)} className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white">
              {QUICK_RANGES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="md:col-span-1 flex md:items-end">
            <button
              type="button"
              onClick={reset}
              disabled={!hasActiveFilters}
              className="w-full inline-flex items-center justify-center gap-2 text-[13px] font-medium text-slate-600 bg-white border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Reset filters"
            >
              <FiX className="text-[14px]" /> Reset
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100 flex-wrap">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <FiFilter className="text-[12px]" /> Sort
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="px-2.5 py-1 text-[12px] border border-slate-200 rounded-md focus:outline-none focus:border-blue-500 bg-white">
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {hasActiveFilters && (
            <>
              <span className="text-slate-300">|</span>
              <span className="text-[11px] text-slate-500">Filters active</span>
            </>
          )}
          {stats?.overdue_count > 0 && !status && !priority && (
            <button
              type="button"
              onClick={() => { setStatus('new'); setSort('oldest'); }}
              className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-md hover:bg-red-100 transition-colors"
            >
              <FiAlertOctagon className="text-[11px]" /> Show {stats.overdue_count} overdue
            </button>
          )}
        </div>
      </div>

      {/* Bulk action bar (visible only when selection exists) */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center justify-between flex-wrap gap-2">
          <div className="text-[13px] text-slate-700">
            <span className="font-semibold tabular-nums">{selectedIds.size}</span> selected
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button type="button" disabled={bulkBusy} onClick={() => bulkSetStatus('contacted')}
                    className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-700 bg-white border border-slate-200 px-2.5 py-1.5 rounded-md hover:bg-slate-50 transition-colors disabled:opacity-50">
              <FiSend className="text-[12px]" /> Mark contacted
            </button>
            <button type="button" disabled={bulkBusy} onClick={() => bulkSetStatus('closed')}
                    className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-700 bg-white border border-slate-200 px-2.5 py-1.5 rounded-md hover:bg-slate-50 transition-colors disabled:opacity-50">
              <FiCheckCircle className="text-[12px]" /> Mark closed
            </button>
            <button type="button" disabled={bulkBusy} onClick={() => bulkSetStatus('new')}
                    className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-700 bg-white border border-slate-200 px-2.5 py-1.5 rounded-md hover:bg-slate-50 transition-colors disabled:opacity-50">
              <FiClock className="text-[12px]" /> Reopen
            </button>
            <button type="button" disabled={bulkBusy} onClick={bulkRemove}
                    className="inline-flex items-center gap-1.5 text-[12px] font-medium text-red-600 bg-white border border-red-200 px-2.5 py-1.5 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50">
              <FiTrash2 className="text-[12px]" /> Delete
            </button>
            <button type="button" onClick={() => setSelectedIds(new Set())}
                    className="inline-flex items-center gap-1 text-[12px] font-medium text-slate-500 hover:text-slate-700 px-2 py-1.5 rounded-md transition-colors">
              <FiX className="text-[12px]" /> Clear
            </button>
          </div>
        </div>
      )}

      {/* 6.4 Data table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 w-8">
                  <input
                    type="checkbox" checked={allSelected} onChange={toggleAll}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    aria-label="Select all visible enquiries"
                  />
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Enquirer</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Subject / message</th>
                <ThSort label="Priority" sortBy={sort} onSort={setSort}
                        asc="priority" desc="priority" />
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</th>
                <ThSort label="Waited" sortBy={sort} onSort={setSort}
                        asc="oldest" desc="newest" />
                <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}><td colSpan={7} className="px-5 py-3"><SkeletonRow /></td></tr>
              ))}

              {!loading && rows.map((e) => {
                const overdue = isOverdue(e);
                const initials = (e.name || '?').split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
                const isSelected = selectedIds.has(e.id);
                return (
                  <tr
                    key={e.id}
                    className={[
                      'transition-colors',
                      isSelected ? 'bg-blue-50/60' : '',
                      overdue ? 'bg-red-50/30' : '',
                      'hover:bg-slate-50',
                    ].join(' ')}
                  >
                    <td className="px-5 py-3.5">
                      <input
                        type="checkbox" checked={isSelected} onChange={() => toggleOne(e.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        aria-label={`Select enquiry ${e.id}`}
                      />
                    </td>

                    {/* Enquirer */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center text-[12px] font-semibold shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => setDrawerId(e.id)}
                            className="text-[13px] font-semibold text-slate-900 hover:text-blue-700 text-left truncate block"
                          >
                            {e.name}
                          </button>
                          <div className="text-[11px] text-slate-500 truncate">{e.email}</div>
                          {e.mobile && (
                            <div className="text-[11px] text-slate-500 font-mono tabular-nums">{e.mobile}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Subject + first line of message */}
                    <td className="px-5 py-3.5 max-w-[360px]">
                      {e.subject && (
                        <div className="text-[13px] font-medium text-slate-900 truncate">{e.subject}</div>
                      )}
                      <div className={`text-[12px] text-slate-500 line-clamp-2 ${e.subject ? 'mt-0.5' : ''}`}>
                        {e.message}
                      </div>
                    </td>

                    {/* Priority */}
                    <td className="px-5 py-3.5">
                      <PriorityChip value={e.priority} />
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <StatusBadge value={e.status} />
                        {overdue && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                            <FiAlertOctagon className="text-[10px]" /> SLA
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Waited */}
                    <td className="px-5 py-3.5">
                      <div className={`text-[12px] tabular-nums ${overdue ? 'text-red-700 font-semibold' : 'text-slate-700'}`}>
                        {waitedSince(e.created_at)}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(e.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        {e.mobile && (
                          <RowIcon
                            href={waUrl(e.mobile, `Hi ${(e.name || '').split(' ')[0]}, this is Lumière Skin Clinic regarding your enquiry.`)}
                            title="WhatsApp"
                          >
                            <FiMessageCircle className="text-[13px]" />
                          </RowIcon>
                        )}
                        <RowIcon
                          href={`mailto:${e.email}?subject=${encodeURIComponent(`Re: ${e.subject || 'Your enquiry'}`)}`}
                          title="Email"
                        >
                          <FiMail className="text-[13px]" />
                        </RowIcon>
                        <button
                          type="button"
                          onClick={() => setDrawerId(e.id)}
                          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1.5 rounded-md hover:bg-blue-100 transition-colors ml-1"
                        >
                          <FiEye className="text-[12px]" /> View
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <FiInbox className="text-2xl mx-auto text-slate-300 mb-2" />
                    <p className="text-[13px] text-slate-700 font-semibold">
                      {hasActiveFilters ? 'No enquiries match these filters' : 'No enquiries yet'}
                    </p>
                    {hasActiveFilters && (
                      <button type="button" onClick={reset}
                              className="mt-3 inline-flex items-center gap-2 text-[12px] font-medium text-blue-600 hover:text-blue-700">
                        <FiX className="text-[12px]" /> Clear filters
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 text-[12px] text-slate-600 flex items-center justify-between">
          <span>
            Showing <span className="font-semibold text-slate-900 tabular-nums">{rows.length}</span>
            {stats ? <> of <span className="font-semibold text-slate-900 tabular-nums">{stats.total}</span></> : null}
          </span>
          <span className="text-[11px] text-slate-400">Server pages at 100 per request — narrow filters to dig deeper.</span>
        </div>
      </div>

      <EnquiryDetailsDrawer
        enquiryId={drawerId}
        onClose={() => setDrawerId(null)}
        onChange={(updated) => {
          setRows((cur) => cur.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
          fetchStats();
        }}
        onDeleted={(id) => {
          setRows((cur) => cur.filter((r) => r.id !== id));
          setDrawerId(null);
          fetchStats();
        }}
      />
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  Small page-local helpers                                         */
/* ---------------------------------------------------------------- */

function ThSort({ label, sortBy, onSort, asc, desc }) {
  const isAsc  = sortBy === asc;
  const isDesc = sortBy === desc && sortBy !== asc;
  const next   = isAsc ? desc : asc;
  return (
    <th className="px-5 py-3 text-left">
      <button
        type="button"
        onClick={() => onSort(next)}
        className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-700 transition-colors"
      >
        {label}
        {(isAsc || isDesc) && (isAsc ? <FiChevronUp className="text-[12px]" /> : <FiChevronDown className="text-[12px]" />)}
      </button>
    </th>
  );
}

function PriorityChip({ value }) {
  const tone = PRIORITY_TONES[value] || PRIORITY_TONES.normal;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${tone}`}>
      {value === 'urgent'
        ? <FiAlertOctagon className="text-[10px]" />
        : <FiFlag className="text-[10px]" />}
      {value || 'normal'}
    </span>
  );
}

function RowIcon({ children, href, title }) {
  return (
    <a
      href={href} target="_blank" rel="noreferrer" title={title}
      className="w-8 h-8 rounded-md text-slate-500 hover:text-blue-700 hover:bg-blue-50 flex items-center justify-center transition-colors"
    >
      {children}
    </a>
  );
}
