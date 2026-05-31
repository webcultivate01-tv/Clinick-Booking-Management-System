import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  FiSearch, FiUser, FiUserPlus, FiUserCheck, FiPercent,
  FiFilter, FiRefreshCw, FiX, FiChevronUp, FiChevronDown,
  FiMessageCircle, FiMail, FiEye, FiInbox,
} from 'react-icons/fi';
import { api } from '../../api/axios';
import PageHeader from '../../components/dashboard/PageHeader';
import StatCard from '../../components/dashboard/StatCard';
import ExportButtons from '../../components/dashboard/ExportButtons';
import { formatDateLong } from '../../utils/formatters';
import PatientDetailsDrawer, { waUrl, ageFromDob } from '../../components/dashboard/PatientDetailsDrawer';
import { SkeletonRow } from '../../components/dashboard/Skeleton';

/* ---------------------------------------------------------------- */
/*  Filter constants                                                 */
/* ---------------------------------------------------------------- */

const GENDER_OPTIONS = [
  { value: '',       label: 'All genders' },
  { value: 'female', label: 'Female' },
  { value: 'male',   label: 'Male' },
  { value: 'other',  label: 'Other' },
  { value: 'unspecified', label: 'Unspecified' },
];

const AGE_BANDS = [
  { value: '',      label: 'All ages' },
  { value: '<18',   label: 'Under 18',    min: 0,  max: 17 },
  { value: '18-25', label: '18–25 yrs',   min: 18, max: 25 },
  { value: '26-35', label: '26–35 yrs',   min: 26, max: 35 },
  { value: '36-50', label: '36–50 yrs',   min: 36, max: 50 },
  { value: '50+',   label: '50+ yrs',     min: 51, max: 999 },
  { value: 'no_dob', label: 'No DOB on file' },
];

const JOINED_WINDOWS = [
  { value: '',     label: 'Any time' },
  { value: '7d',   label: 'Joined last 7 days',  days: 7 },
  { value: '30d',  label: 'Joined last 30 days', days: 30 },
  { value: '90d',  label: 'Joined last 90 days', days: 90 },
  { value: '12m',  label: 'Joined this year',    days: 365 },
];

const SORT_OPTIONS = [
  { value: 'newest',  label: 'Newest first',  field: 'created_at',  dir: 'desc' },
  { value: 'oldest',  label: 'Oldest first',  field: 'created_at',  dir: 'asc'  },
  { value: 'name_az', label: 'Name A → Z',    field: 'full_name',   dir: 'asc'  },
  { value: 'name_za', label: 'Name Z → A',    field: 'full_name',   dir: 'desc' },
  { value: 'age_asc',   label: 'Youngest first', field: 'age',     dir: 'asc'  },
  { value: 'age_desc',  label: 'Oldest first',   field: 'age',     dir: 'desc' },
];

/* ---------------------------------------------------------------- */
/*  Page                                                             */
/* ---------------------------------------------------------------- */

export default function Patients() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch]   = useState('');
  const [gender, setGender]   = useState('');
  const [ageBand, setAgeBand] = useState('');
  const [joined, setJoined]   = useState('');
  const [sortBy, setSortBy]   = useState('newest');

  const [drawerId, setDrawerId] = useState(null);

  const fetchRows = () => {
    setLoading(true);
    api.get('/admin/patients', { params: search ? { search } : {} })
      .then((res) => setRows(res.data || []))
      .catch((err) => toast.error(err.message || 'Failed to load patients'))
      .finally(() => setLoading(false));
  };

  // Debounced fetch on search change. Other filters are client-side over the
  // last server response, which keeps the UI snappy for clinics with a few
  // thousand patients (server already returns max 50 per page; bump if needed).
  useEffect(() => {
    const t = setTimeout(fetchRows, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  /* -------- Client-side filtering + sorting -------- */
  const filtered = useMemo(() => {
    let out = rows;

    // Gender
    if (gender === 'unspecified') {
      out = out.filter((p) => !p.gender);
    } else if (gender) {
      out = out.filter((p) => p.gender === gender);
    }

    // Age band
    if (ageBand === 'no_dob') {
      out = out.filter((p) => !p.dob);
    } else if (ageBand) {
      const band = AGE_BANDS.find((b) => b.value === ageBand);
      if (band) {
        out = out.filter((p) => {
          const a = ageFromDob(p.dob);
          return a != null && a >= band.min && a <= band.max;
        });
      }
    }

    // Joined window
    if (joined) {
      const win = JOINED_WINDOWS.find((w) => w.value === joined);
      if (win) {
        const cutoff = Date.now() - win.days * 86_400_000;
        out = out.filter((p) => new Date(p.created_at).getTime() >= cutoff);
      }
    }

    // Sort
    const opt = SORT_OPTIONS.find((s) => s.value === sortBy) || SORT_OPTIONS[0];
    const cmp = (a, b) => {
      let av, bv;
      if (opt.field === 'age') {
        av = ageFromDob(a.dob) ?? -1;
        bv = ageFromDob(b.dob) ?? -1;
      } else if (opt.field === 'created_at') {
        av = new Date(a.created_at).getTime();
        bv = new Date(b.created_at).getTime();
      } else {
        av = String(a[opt.field] || '').toLowerCase();
        bv = String(b[opt.field] || '').toLowerCase();
      }
      if (av < bv) return opt.dir === 'asc' ? -1 : 1;
      if (av > bv) return opt.dir === 'asc' ? 1 : -1;
      return 0;
    };
    return [...out].sort(cmp);
  }, [rows, gender, ageBand, joined, sortBy]);

  /* -------- Stat summary (computed from the current server response) -------- */
  const summary = useMemo(() => {
    const total = rows.length;
    const female = rows.filter((p) => p.gender === 'female').length;
    const male   = rows.filter((p) => p.gender === 'male').length;
    const cutoff30 = Date.now() - 30 * 86_400_000;
    const newThisMonth = rows.filter((p) => new Date(p.created_at).getTime() >= cutoff30).length;
    const withDob = rows.filter((p) => p.dob).length;
    const profileScore = total ? Math.round((withDob / total) * 100) : 0;
    return { total, female, male, newThisMonth, profileScore };
  }, [rows]);

  const hasActiveFilters = !!(gender || ageBand || joined || sortBy !== 'newest');
  const resetFilters = () => { setGender(''); setAgeBand(''); setJoined(''); setSortBy('newest'); };

  const exportColumns = [
    { key: 'full_name', label: 'Name' },
    { key: 'email',     label: 'Email' },
    { key: 'mobile',    label: 'Mobile' },
    { label: 'Age',     map: (r) => ageFromDob(r.dob) ?? '' },
    { label: 'Date of Birth', map: (r) => (r.dob ? formatDateLong(r.dob) : '') },
    { key: 'gender',    label: 'Gender' },
    { label: 'Joined',  map: (r) => new Date(r.created_at).toLocaleDateString('en-IN') },
  ];

  return (
    <div className="space-y-6">
      {/* 6.1 Page header */}
      <PageHeader
        title="Patients"
        subtitle={`${filtered.length} of ${rows.length} patient${rows.length === 1 ? '' : 's'} shown`}
      >
        <button
          type="button"
          onClick={fetchRows}
          className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-600 bg-white border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <FiRefreshCw className="text-[14px]" /> Refresh
        </button>
        <ExportButtons
          filename="patients"
          title="Patients directory"
          subtitle={`${filtered.length} patient${filtered.length === 1 ? '' : 's'}${search ? ` · search="${search}"` : ''}`}
          columns={exportColumns}
          rows={filtered}
          dateField="created_at"
        />
      </PageHeader>

      {/* 6.2 Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard accent="blue"    iconNode={<FiUser className="text-base" />}      label="Total Patients" value={summary.total} />
        <StatCard accent="emerald" iconNode={<FiUserPlus className="text-base" />}  label="New (30 days)"  value={summary.newThisMonth} trend={summary.newThisMonth > 0 ? 'Growing' : undefined} />
        <StatCard accent="indigo"  iconNode={<FiUserCheck className="text-base" />} label="Female / Male"  value={`${summary.female} / ${summary.male}`} />
        <StatCard accent="amber"   iconNode={<FiPercent className="text-base" />}   label="Profile Complete" value={`${summary.profileScore}%`} trendTone={summary.profileScore >= 70 ? 'emerald' : 'amber'} />
      </div>

      {/* 6.3 Filter bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search — col-span-5 */}
          <div className="md:col-span-5">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Search</label>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[14px]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, email or mobile…"
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

          {/* Gender — col-span-2 */}
          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Gender</label>
            <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white">
              {GENDER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Age band — col-span-2 */}
          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Age</label>
            <select value={ageBand} onChange={(e) => setAgeBand(e.target.value)} className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white">
              {AGE_BANDS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Joined — col-span-2 */}
          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Joined</label>
            <select value={joined} onChange={(e) => setJoined(e.target.value)} className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white">
              {JOINED_WINDOWS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Reset — col-span-1 */}
          <div className="md:col-span-1 flex md:items-end">
            <button
              type="button"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
              className="w-full inline-flex items-center justify-center gap-2 text-[13px] font-medium text-slate-600 bg-white border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Reset filters"
            >
              <FiX className="text-[14px]" /> Reset
            </button>
          </div>
        </div>

        {/* Sort + active filter chips row */}
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100 flex-wrap">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <FiFilter className="text-[12px]" /> Sort
          </div>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-2.5 py-1 text-[12px] border border-slate-200 rounded-md focus:outline-none focus:border-blue-500 bg-white">
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {hasActiveFilters && (
            <>
              <span className="text-slate-300">|</span>
              <span className="text-[11px] text-slate-500">Filters active</span>
            </>
          )}
        </div>
      </div>

      {/* 6.4 Data table card */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <ThSort label="Patient"   field="full_name" sortBy={sortBy} onSort={setSortBy}
                        asc="name_az" desc="name_za" />
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Contact</th>
                <ThSort label="Age"       field="age"        sortBy={sortBy} onSort={setSortBy}
                        asc="age_asc" desc="age_desc" />
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Gender</th>
                <ThSort label="Joined"    field="created_at" sortBy={sortBy} onSort={setSortBy}
                        asc="oldest" desc="newest" />
                <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={6} className="px-5 py-3"><SkeletonRow /></td>
                </tr>
              ))}

              {!loading && filtered.map((p) => {
                const age = ageFromDob(p.dob);
                const initials = (p.full_name || '?').split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    {/* Patient (avatar + name + id) */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center text-[12px] font-semibold shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => setDrawerId(p.id)}
                            className="text-[13px] font-semibold text-slate-900 hover:text-blue-700 text-left truncate"
                          >
                            {p.full_name}
                          </button>
                          <div className="text-[11px] text-slate-500 font-mono tabular-nums">#{p.id}</div>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-5 py-3.5">
                      <div className="text-[12px] text-slate-700 truncate max-w-[220px]">{p.email}</div>
                      <div className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5">{p.mobile}</div>
                    </td>

                    {/* Age */}
                    <td className="px-5 py-3.5 text-[13px] text-slate-700 tabular-nums">
                      {age != null ? `${age} yrs` : <span className="text-slate-400">—</span>}
                    </td>

                    {/* Gender */}
                    <td className="px-5 py-3.5">
                      {p.gender
                        ? <GenderChip gender={p.gender} />
                        : <span className="text-[11px] text-slate-400">—</span>}
                    </td>

                    {/* Joined */}
                    <td className="px-5 py-3.5 text-[12px] text-slate-700 tabular-nums whitespace-nowrap">
                      {new Date(p.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <RowIcon href={waUrl(p.mobile, `Hi ${p.full_name?.split(' ')[0] || ''}, this is Lumière Skin Clinic.`)} title="WhatsApp">
                          <FiMessageCircle className="text-[13px]" />
                        </RowIcon>
                        <RowIcon href={`mailto:${p.email}`} title="Email">
                          <FiMail className="text-[13px]" />
                        </RowIcon>
                        <button
                          type="button"
                          onClick={() => setDrawerId(p.id)}
                          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1.5 rounded-md hover:bg-blue-100 transition-colors ml-1"
                        >
                          <FiEye className="text-[12px]" /> View Details
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <FiInbox className="text-2xl mx-auto text-slate-300 mb-2" />
                    <p className="text-[13px] text-slate-700 font-semibold">
                      {rows.length === 0 ? 'No patients yet' : 'No patients match these filters'}
                    </p>
                    {rows.length > 0 && (
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="mt-3 inline-flex items-center gap-2 text-[12px] font-medium text-blue-600 hover:text-blue-700"
                      >
                        <FiX className="text-[12px]" /> Clear filters
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer summary */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 text-[12px] text-slate-600 flex items-center justify-between">
          <span>
            Showing <span className="font-semibold text-slate-900 tabular-nums">{filtered.length}</span> of{' '}
            <span className="font-semibold text-slate-900 tabular-nums">{rows.length}</span>
          </span>
          <span className="text-[11px] text-slate-400">Server returns up to 50 — refine search to find older patients.</span>
        </div>
      </div>

      <PatientDetailsDrawer patientId={drawerId} onClose={() => setDrawerId(null)} />
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  Tiny presentational helpers (page-local)                         */
/* ---------------------------------------------------------------- */

function ThSort({ label, field, sortBy, onSort, asc, desc }) {
  const isAsc  = sortBy === asc;
  const isDesc = sortBy === desc;
  const next = isAsc ? desc : asc;
  return (
    <th className="px-5 py-3 text-left">
      <button
        type="button"
        onClick={() => onSort(next)}
        className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-700 transition-colors"
      >
        {label}
        {(isAsc || isDesc) && (
          isAsc ? <FiChevronUp className="text-[12px]" /> : <FiChevronDown className="text-[12px]" />
        )}
      </button>
    </th>
  );
}

const GENDER_TONES = {
  female: 'bg-pink-50 text-pink-700',
  male:   'bg-blue-50 text-blue-700',
  other:  'bg-violet-50 text-violet-700',
};
function GenderChip({ gender }) {
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded capitalize ${GENDER_TONES[gender] || 'bg-slate-100 text-slate-600'}`}>
      {gender}
    </span>
  );
}

function RowIcon({ children, href, ...props }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      {...props}
      className="w-8 h-8 rounded-md text-slate-500 hover:text-blue-700 hover:bg-blue-50 flex items-center justify-center transition-colors"
    >
      {children}
    </a>
  );
}
