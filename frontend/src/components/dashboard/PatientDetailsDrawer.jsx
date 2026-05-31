import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FiX, FiPhone, FiMail, FiMessageCircle, FiCopy, FiUser,
  FiCalendar, FiClock, FiTrendingUp, FiFileText, FiCreditCard,
  FiExternalLink,
} from 'react-icons/fi';
import { api } from '../../api/axios';
import { formatDateLong, formatTime12, formatINR } from '../../utils/formatters';
import StatusBadge from '../common/StatusBadge';
import { SkeletonText, SkeletonRow } from './Skeleton';

/* ---------------------------------------------------------------- */
/*  Helpers                                                          */
/* ---------------------------------------------------------------- */

/** Years between dob and now. Returns null if dob missing/invalid. */
function ageFromDob(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

/** Days between two ISO dates, returns null if either missing. */
function daysSince(iso) {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / 86_400_000);
}

/** "Mobile number" → E.164-ish for WhatsApp (assume India +91). */
function waUrl(mobile, text = '') {
  const digits = String(mobile || '').replace(/\D/g, '');
  if (!digits) return '#';
  const intl = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${intl}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

function copy(text) {
  if (!text) return;
  navigator.clipboard?.writeText(text).catch(() => {});
}

/* ---------------------------------------------------------------- */
/*  Drawer                                                           */
/* ---------------------------------------------------------------- */

/**
 * Slide-in patient details drawer. Loads /admin/patients/:id, shows the
 * patient card (name + chips), lifetime stat tiles, appointments and
 * payments histories, plus contact actions (WhatsApp, Email, Call).
 *
 *   <PatientDetailsDrawer patientId={p.id} onClose={...} />
 */
export default function PatientDetailsDrawer({ patientId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('appointments');

  useEffect(() => {
    if (!patientId) return;
    setLoading(true);
    setData(null);
    api.get(`/admin/patients/${patientId}`)
      .then((res) => setData(res.data || null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [patientId]);

  // ESC closes the drawer.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <AnimatePresence>
      {patientId && (
        <>
          <motion.div
            className="dash-drawer-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="dash-drawer"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.22 }}
            role="dialog"
            aria-label="Patient details"
          >
            {loading || !data
              ? <DrawerSkeleton onClose={onClose} />
              : <DrawerBody data={data} tab={tab} setTab={setTab} onClose={onClose} />}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/* ---------------------------------------------------------------- */
/*  Drawer body                                                      */
/* ---------------------------------------------------------------- */

function DrawerBody({ data, tab, setTab, onClose }) {
  const { patient, stats, appointments, payments } = data;
  const age = ageFromDob(patient.dob);
  const initials = (patient.full_name || '?')
    .split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const lastVisitDays = daysSince(stats.last_visit);

  return (
    <>
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-[15px]">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="text-[15px] font-semibold text-slate-900 truncate">{patient.full_name}</div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
              <span>Patient #</span><span className="font-mono tabular-nums">{patient.id}</span>
              <span>·</span>
              <span>Since {new Date(patient.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="w-9 h-9 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 flex items-center justify-center transition-colors"
        >
          <FiX className="text-[16px]" />
        </button>
      </div>

      {/* Scroll body */}
      <div className="dash-scroll flex-1 overflow-y-auto">
        {/* Profile card */}
        <div className="p-6 border-b border-slate-100">
          <div className="grid grid-cols-2 gap-3 text-[13px]">
            <Field label="Email" value={patient.email}
                   actions={(
                     <>
                       <ActionMini href={`mailto:${patient.email}`} title="Compose email"><FiMail /></ActionMini>
                       <ActionMini onClick={() => copy(patient.email)} title="Copy email"><FiCopy /></ActionMini>
                     </>
                   )} />
            <Field label="Mobile" value={patient.mobile}
                   mono
                   actions={(
                     <>
                       <ActionMini href={`tel:${patient.mobile}`} title="Call"><FiPhone /></ActionMini>
                       <ActionMini onClick={() => copy(patient.mobile)} title="Copy mobile"><FiCopy /></ActionMini>
                     </>
                   )} />
            <Field label="Gender" value={patient.gender ? cap(patient.gender) : '—'} />
            <Field
              label="Date of Birth"
              value={patient.dob ? `${formatDateLong(patient.dob)}${age != null ? ` · ${age} yrs` : ''}` : '—'}
            />
          </div>

          {/* Primary contact actions */}
          <div className="flex flex-wrap gap-2 mt-5">
            <a
              href={waUrl(patient.mobile, `Hi ${patient.full_name?.split(' ')[0] || ''}, this is Lumière Skin Clinic.`)}
              target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 text-[13px] font-medium text-white bg-[#25d366] hover:bg-[#1ebe57] px-3 py-2 rounded-lg transition-colors"
            >
              <FiMessageCircle className="text-[14px]" /> WhatsApp
            </a>
            <a
              href={`mailto:${patient.email}?subject=${encodeURIComponent('Regarding your appointment at Lumière Skin Clinic')}`}
              className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 px-3 py-2 rounded-lg transition-colors"
            >
              <FiMail className="text-[14px]" /> Email
            </a>
            <a
              href={`tel:${patient.mobile}`}
              className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 px-3 py-2 rounded-lg transition-colors"
            >
              <FiPhone className="text-[14px]" /> Call
            </a>
          </div>
        </div>

        {/* Lifetime stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-5 border-b border-slate-100">
          <StatMini Icon={FiCalendar} label="Bookings"      value={stats.total_appointments} accent="blue" />
          <StatMini Icon={FiTrendingUp} label="Lifetime ₹"  value={formatINR(stats.lifetime_value)} accent="emerald" />
          <StatMini Icon={FiClock} label="Last visit"
                    value={stats.last_visit ? `${lastVisitDays}d ago` : '—'} accent="amber" />
          <StatMini Icon={FiUser} label="Completed"
                    value={`${stats.completed_count}/${stats.total_appointments || 0}`} accent="indigo" />
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4">
          <div className="flex items-center gap-1 border-b border-slate-200">
            <Tab active={tab === 'appointments'} onClick={() => setTab('appointments')}>
              <FiCalendar className="text-[13px]" /> Appointments
              <span className="ml-1 text-[10px] font-semibold text-slate-400 tabular-nums">{appointments.length}</span>
            </Tab>
            <Tab active={tab === 'payments'} onClick={() => setTab('payments')}>
              <FiCreditCard className="text-[13px]" /> Payments
              <span className="ml-1 text-[10px] font-semibold text-slate-400 tabular-nums">{payments.length}</span>
            </Tab>
            <Tab active={tab === 'notes'} onClick={() => setTab('notes')}>
              <FiFileText className="text-[13px]" /> Notes
            </Tab>
          </div>

          {/* Tab body */}
          <div className="py-4">
            {tab === 'appointments' && <AppointmentsList rows={appointments} />}
            {tab === 'payments'     && <PaymentsList rows={payments} />}
            {tab === 'notes'        && <NotesList rows={appointments} />}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
        <div className="text-[11px] text-slate-500">
          Last updated {new Date(patient.updated_at || patient.created_at).toLocaleString('en-IN')}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-600 bg-white border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Close
        </button>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- */
/*  Tab bodies                                                       */
/* ---------------------------------------------------------------- */

function AppointmentsList({ rows }) {
  if (!rows.length) {
    return <Empty Icon={FiCalendar} title="No appointments yet" sub="This patient hasn't booked any treatment." />;
  }
  return (
    <div className="space-y-2">
      {rows.map((a) => (
        <div key={a.id} className="border border-slate-200 rounded-lg p-3 hover:border-slate-300 transition-colors">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[13px] font-semibold text-slate-900 truncate">{a.service_title}</span>
                {a.queue_number != null && (
                  <span className="text-[10px] font-mono font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-1.5 rounded tabular-nums">#{a.queue_number}</span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1"><FiCalendar className="text-[10px]" /> {formatDateLong(a.appointment_date)}</span>
                <span className="inline-flex items-center gap-1"><FiClock className="text-[10px]" /> {formatTime12(a.appointment_time)}</span>
                {a.doctor_name && <span>· {a.doctor_name}</span>}
              </div>
            </div>
            <div className="text-right shrink-0">
              {a.amount != null && (
                <div className="text-[13px] font-semibold text-slate-900 tabular-nums">{formatINR(a.amount)}</div>
              )}
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">{a.payment_mode}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            <StatusBadge value={a.appointment_status} />
            <StatusBadge value={a.payment_status} />
            <span className="text-[10px] text-slate-400 ml-auto">
              Booked {new Date(a.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
          {a.problem_description && (
            <div className="mt-2.5 pt-2.5 border-t border-slate-100 text-[12px] text-slate-600 line-clamp-3">
              {a.problem_description}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function PaymentsList({ rows }) {
  if (!rows.length) {
    return <Empty Icon={FiCreditCard} title="No payments yet" sub="Online payments will appear here once collected." />;
  }
  return (
    <div className="space-y-2">
      {rows.map((p) => (
        <div key={p.id} className="border border-slate-200 rounded-lg p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-slate-900 tabular-nums">{formatINR(p.amount)}</div>
              <div className="text-[11px] text-slate-500 mt-1 font-mono truncate">
                {p.razorpay_payment_id || p.razorpay_order_id}
              </div>
            </div>
            <div className="shrink-0 flex flex-col items-end gap-1">
              <StatusBadge value={p.payment_status} />
              <span className="text-[10px] text-slate-400">
                {p.paid_at
                  ? new Date(p.paid_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                  : new Date(p.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
              </span>
            </div>
          </div>
          {p.payment_method && (
            <div className="text-[11px] text-slate-500 mt-2 capitalize">via {p.payment_method}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function NotesList({ rows }) {
  const notes = rows.filter((r) => r.internal_note && r.internal_note.trim());
  if (!notes.length) {
    return <Empty Icon={FiFileText} title="No notes" sub="Staff notes added to bookings will show here." />;
  }
  return (
    <div className="space-y-2">
      {notes.map((n) => (
        <div key={n.id} className="border border-slate-200 rounded-lg p-3">
          <div className="text-[11px] text-slate-500 flex items-center gap-2 mb-1.5">
            <FiCalendar className="text-[10px]" />
            {formatDateLong(n.appointment_date)} · {n.service_title}
          </div>
          <div className="text-[12px] text-slate-700 whitespace-pre-wrap">{n.internal_note}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/*  Small pieces                                                     */
/* ---------------------------------------------------------------- */

function Field({ label, value, actions, mono = false }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">{label}</div>
      <div className="flex items-center gap-2 mt-1">
        <span className={`text-[13px] text-slate-900 truncate ${mono ? 'font-mono tabular-nums' : ''}`}>
          {value || '—'}
        </span>
        {value && actions && (
          <span className="flex items-center gap-1 ml-auto opacity-70 hover:opacity-100 transition-opacity">{actions}</span>
        )}
      </div>
    </div>
  );
}

function ActionMini({ children, ...props }) {
  const Tag = props.href ? 'a' : 'button';
  const extra = props.href ? { target: '_blank', rel: 'noreferrer' } : { type: 'button' };
  return (
    <Tag
      {...extra}
      {...props}
      className="w-6 h-6 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center text-[11px] transition-colors"
    >
      {children}
    </Tag>
  );
}

const STAT_TONES = {
  blue:    'bg-blue-50 text-blue-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber:   'bg-amber-50 text-amber-600',
  indigo:  'bg-indigo-50 text-indigo-600',
};

function StatMini({ Icon, label, value, accent = 'blue' }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center gap-3">
      <span className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${STAT_TONES[accent]}`}>
        <Icon className="text-[14px]" />
      </span>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 truncate">{label}</div>
        <div className="text-[14px] font-semibold text-slate-900 tabular-nums leading-tight mt-0.5 truncate">{value}</div>
      </div>
    </div>
  );
}

function Tab({ active, children, ...props }) {
  return (
    <button
      type="button"
      {...props}
      className={[
        'flex items-center gap-2 px-3 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors',
        active
          ? 'border-blue-600 text-blue-700'
          : 'border-transparent text-slate-500 hover:text-slate-700',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function Empty({ Icon, title, sub }) {
  return (
    <div className="text-center py-10 px-6">
      <div className="w-12 h-12 mx-auto rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center mb-2">
        <Icon className="text-xl" />
      </div>
      <div className="text-[13px] font-semibold text-slate-900">{title}</div>
      {sub && <p className="text-[12px] text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

function cap(s) { return String(s || '').replace(/^./, (c) => c.toUpperCase()); }

/* Skeleton placeholder while loading. */
function DrawerSkeleton({ onClose }) {
  return (
    <>
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-3 flex-1">
          <div className="skel w-11 h-11 rounded-lg" />
          <div className="flex-1 space-y-2">
            <SkeletonText width="50%" />
            <SkeletonText width="30%" />
          </div>
        </div>
        <button
          type="button" onClick={onClose} aria-label="Close"
          className="w-9 h-9 rounded-lg text-slate-500 hover:bg-slate-100 flex items-center justify-center"
        >
          <FiX className="text-[16px]" />
        </button>
      </div>
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-2 gap-3">
          {[0,1,2,3].map((i) => (
            <div key={i} className="space-y-2">
              <SkeletonText width="40%" />
              <SkeletonText width="80%" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[0,1,2,3].map((i) => <SkeletonRow key={i} />)}
        </div>
        <div className="space-y-2">
          {[0,1,2,3].map((i) => <SkeletonRow key={i} />)}
        </div>
      </div>
    </>
  );
}

/* Re-export helpers so the page can also use them (e.g. waUrl for row actions). */
export { waUrl, ageFromDob, daysSince };
