import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FiX, FiPhone, FiMail, FiMessageCircle, FiCopy, FiClock,
  FiAlertOctagon, FiFlag, FiCheckCircle, FiEdit2, FiSave,
  FiTrash2, FiSend, FiUser,
} from 'react-icons/fi';
import { api } from '../../api/axios';
import StatusBadge from '../common/StatusBadge';
import { SkeletonText, SkeletonRow } from './Skeleton';

/* ---------------------------------------------------------------- */
/*  Constants & helpers                                              */
/* ---------------------------------------------------------------- */

const STATUSES   = ['new', 'contacted', 'closed'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

const PRIORITY_TONES = {
  urgent: 'bg-red-50 text-red-700 border-red-200',
  high:   'bg-amber-50 text-amber-700 border-amber-200',
  normal: 'bg-slate-50 text-slate-700 border-slate-200',
  low:    'bg-slate-50 text-slate-500 border-slate-200',
};

/** "Hi {first}, thanks for reaching out — this is Lumière Skin Clinic…" */
const REPLY_TEMPLATES = [
  {
    label: 'Initial acknowledgement',
    body:  'Hi {first}, thanks for reaching out to Lumière Skin Clinic. We have received your enquiry and our team will get back to you within 24 hours. Warm regards.',
  },
  {
    label: 'Booking link',
    body:  'Hi {first}, we would love to assist with "{subject}". You can book a consultation here: https://lumiere-skin.example/appointment — or reply with a date/time that works for you.',
  },
  {
    label: 'Need more info',
    body:  'Hi {first}, thanks for your message about "{subject}". To recommend the right treatment, could you share a few more details about the area of concern and any recent products you have been using?',
  },
  {
    label: 'Closing — issue resolved',
    body:  'Hi {first}, glad we could help. We are closing this enquiry — feel free to reply if anything else comes up. Wishing you healthy, glowing skin!',
  },
];

const waUrl = (mobile, text = '') => {
  const digits = String(mobile || '').replace(/\D/g, '');
  if (!digits) return '#';
  const intl = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${intl}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
};

const copy = (text) => {
  if (!text) return;
  navigator.clipboard?.writeText(text)
    .then(() => toast.success('Copied'))
    .catch(() => {});
};

/** Human-readable wait time since the enquiry came in. */
function waitedSince(iso) {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 60)        return `${min}m`;
  if (min < 60 * 24)   return `${Math.floor(min / 60)}h`;
  return `${Math.floor(min / (60 * 24))}d`;
}

/** YES if a 'new' enquiry is older than 24 hours — used for SLA badge. */
const isOverdue = (e) =>
  e?.status === 'new' && (Date.now() - new Date(e.created_at).getTime()) > 24 * 60 * 60 * 1000;

/* ---------------------------------------------------------------- */
/*  Drawer                                                           */
/* ---------------------------------------------------------------- */

/**
 * Slide-in enquiry triage panel.
 *
 *   <EnquiryDetailsDrawer enquiryId={id} onClose={...} onChange={(updated) => ...} />
 *
 * - Header: name + #id + status pill + priority pill + waited-time chip
 * - Contact card with WhatsApp / Email / Call (each pre-fills templates)
 * - Subject + full message (whitespace preserved)
 * - Workflow: status + priority selectors, internal notes textarea, Save
 * - Reply templates: 4 prebuilt blurbs, each can be sent via Email or WhatsApp
 * - Delete (admin) and Close actions in the footer
 */
export default function EnquiryDetailsDrawer({ enquiryId, onClose, onChange, onDeleted }) {
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Local form state — synced on data load.
  const [status, setStatus]     = useState('new');
  const [priority, setPriority] = useState('normal');
  const [note, setNote]         = useState('');

  // Track if user has edited anything compared to what the server has.
  const dirty = useMemo(() => (
    !!data && (
      status   !== data.status
      || priority !== data.priority
      || (note || '') !== (data.internal_note || '')
    )
  ), [data, status, priority, note]);

  useEffect(() => {
    if (!enquiryId) return;
    setLoading(true);
    setData(null);
    api.get(`/enquiries/${enquiryId}`)
      .then((res) => {
        const e = res.data || null;
        setData(e);
        if (e) {
          setStatus(e.status || 'new');
          setPriority(e.priority || 'normal');
          setNote(e.internal_note || '');
        }
      })
      .catch((err) => toast.error(err.message || 'Failed to load enquiry'))
      .finally(() => setLoading(false));
  }, [enquiryId]);

  // Escape closes the drawer (only when there are no unsaved changes — protect work).
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (dirty && !confirm('Discard unsaved changes?')) return;
      onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, dirty]);

  async function save() {
    setSaving(true);
    try {
      const res = await api.patch(`/enquiries/${enquiryId}`, {
        status, priority, internal_note: note || null,
      });
      setData(res.data);
      onChange?.(res.data);
      toast.success('Saved');
    } catch (err) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm('Delete this enquiry permanently?')) return;
    setDeleting(true);
    try {
      await api.delete(`/enquiries/${enquiryId}`);
      onDeleted?.(enquiryId);
      toast.success('Deleted');
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AnimatePresence>
      {enquiryId && (
        <>
          <motion.div
            className="dash-drawer-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => {
              if (dirty && !confirm('Discard unsaved changes?')) return;
              onClose();
            }}
          />
          <motion.aside
            className="dash-drawer"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.22 }}
            role="dialog" aria-label="Enquiry details"
          >
            {loading || !data
              ? <DrawerSkeleton onClose={onClose} />
              : (
                <DrawerBody
                  data={data} status={status} setStatus={setStatus}
                  priority={priority} setPriority={setPriority}
                  note={note} setNote={setNote}
                  dirty={dirty} saving={saving} deleting={deleting}
                  onSave={save} onDelete={remove} onClose={onClose}
                />
              )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/* ---------------------------------------------------------------- */
/*  Drawer body                                                      */
/* ---------------------------------------------------------------- */

function DrawerBody({
  data, status, setStatus, priority, setPriority, note, setNote,
  dirty, saving, deleting, onSave, onDelete, onClose,
}) {
  const overdue = isOverdue(data);
  const initials = (data.name || '?').split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  const fillTemplate = (body) => body
    .replace('{first}', (data.name || 'there').split(' ')[0])
    .replace('{subject}', data.subject || 'your enquiry');

  function sendTemplate(template, channel) {
    const body = fillTemplate(template.body);
    const subject = `Re: ${data.subject || 'Your enquiry at Lumière Skin Clinic'}`;
    if (channel === 'email') {
      window.location.href = `mailto:${data.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    } else {
      window.open(waUrl(data.mobile, body), '_blank', 'noopener');
    }
  }

  return (
    <>
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-[15px]">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[15px] font-semibold text-slate-900 truncate">{data.name}</span>
              <span className="text-[11px] text-slate-500 font-mono tabular-nums">#{data.id}</span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5 flex-wrap">
              <StatusBadge value={data.status} />
              <PriorityChip value={data.priority} />
              <span className="inline-flex items-center gap-1 text-slate-500">
                <FiClock className="text-[10px]" /> Waited {waitedSince(data.created_at)}
              </span>
              {overdue && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                  <FiAlertOctagon className="text-[10px]" /> Overdue
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { if (dirty && !confirm('Discard unsaved changes?')) return; onClose(); }}
          aria-label="Close"
          className="w-9 h-9 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 flex items-center justify-center transition-colors"
        >
          <FiX className="text-[16px]" />
        </button>
      </div>

      {/* Body */}
      <div className="dash-scroll flex-1 overflow-y-auto">
        {/* Contact card */}
        <div className="p-6 border-b border-slate-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Email" value={data.email}
                   actions={(
                     <>
                       <ActionMini href={`mailto:${data.email}`} title="Compose email"><FiMail /></ActionMini>
                       <ActionMini onClick={() => copy(data.email)} title="Copy email"><FiCopy /></ActionMini>
                     </>
                   )} />
            <Field label="Mobile" value={data.mobile || '—'} mono
                   actions={data.mobile && (
                     <>
                       <ActionMini href={`tel:${data.mobile}`} title="Call"><FiPhone /></ActionMini>
                       <ActionMini onClick={() => copy(data.mobile)} title="Copy mobile"><FiCopy /></ActionMini>
                     </>
                   )} />
            <Field label="Received" value={new Date(data.created_at).toLocaleString('en-IN', {
              dateStyle: 'medium', timeStyle: 'short',
            })} />
            <Field label="Last responded"
                   value={data.responded_at
                     ? new Date(data.responded_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                     : 'Not yet'} />
          </div>

          {/* Primary contact actions */}
          <div className="flex flex-wrap gap-2 mt-5">
            <a
              href={waUrl(data.mobile, `Hi ${(data.name || '').split(' ')[0]}, this is Lumière Skin Clinic regarding your enquiry.`)}
              target="_blank" rel="noreferrer"
              className={[
                'inline-flex items-center gap-2 text-[13px] font-medium px-3 py-2 rounded-lg transition-colors',
                data.mobile
                  ? 'text-white bg-[#25d366] hover:bg-[#1ebe57]'
                  : 'text-slate-400 bg-slate-100 cursor-not-allowed pointer-events-none',
              ].join(' ')}
            >
              <FiMessageCircle className="text-[14px]" /> WhatsApp
            </a>
            <a
              href={`mailto:${data.email}?subject=${encodeURIComponent(`Re: ${data.subject || 'Your enquiry'}`)}`}
              className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 px-3 py-2 rounded-lg transition-colors"
            >
              <FiMail className="text-[14px]" /> Email
            </a>
            <a
              href={data.mobile ? `tel:${data.mobile}` : undefined}
              className={[
                'inline-flex items-center gap-2 text-[13px] font-medium px-3 py-2 rounded-lg transition-colors',
                data.mobile
                  ? 'text-slate-700 bg-white border border-slate-200 hover:bg-slate-50'
                  : 'text-slate-400 bg-slate-100 cursor-not-allowed pointer-events-none border border-slate-200',
              ].join(' ')}
            >
              <FiPhone className="text-[14px]" /> Call
            </a>
          </div>
        </div>

        {/* Subject + message */}
        <div className="p-6 border-b border-slate-100">
          <Label>Subject</Label>
          <p className="text-[14px] font-semibold text-slate-900 mt-1">
            {data.subject || <span className="text-slate-400 font-normal italic">(none)</span>}
          </p>
          <Label className="mt-4">Message</Label>
          <p className="text-[13px] text-slate-700 leading-relaxed whitespace-pre-line mt-1 bg-slate-50 border border-slate-200 rounded-lg p-3">
            {data.message}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => copy(data.message)}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-700 transition-colors"
            >
              <FiCopy className="text-[11px]" /> Copy message
            </button>
          </div>
        </div>

        {/* Workflow */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <FiEdit2 className="text-blue-600 text-[14px]" />
            <h4 className="text-[13px] font-semibold text-slate-900">Workflow</h4>
            {dirty && <span className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">Unsaved</span>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Status</Label>
              <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                {STATUSES.map((s) => (
                  <SegmentButton
                    key={s} active={status === s} onClick={() => setStatus(s)}
                    Icon={s === 'new' ? FiClock : s === 'contacted' ? FiSend : FiCheckCircle}
                    label={cap(s)}
                  />
                ))}
              </div>
            </div>
            <div>
              <Label>Priority</Label>
              <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                {PRIORITIES.map((p) => (
                  <SegmentButton
                    key={p} active={priority === p} onClick={() => setPriority(p)}
                    Icon={p === 'urgent' ? FiAlertOctagon : FiFlag}
                    label={cap(p)}
                    tone={p === 'urgent' ? 'red' : p === 'high' ? 'amber' : 'slate'}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <Label>Internal notes <span className="text-slate-400 font-normal normal-case tracking-normal text-[11px]">(only staff see these)</span></Label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="e.g. Called back at 4pm, requested service brochure."
              className="mt-1.5 w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 resize-none"
            />
          </div>

          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={!dirty || saving}
              onClick={onSave}
              className="inline-flex items-center gap-2 text-[13px] font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 rounded-lg transition-colors"
            >
              <FiSave className="text-[14px]" /> {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>

        {/* Reply templates */}
        <div className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <FiSend className="text-blue-600 text-[14px]" />
            <h4 className="text-[13px] font-semibold text-slate-900">Quick reply templates</h4>
          </div>
          <div className="space-y-2">
            {REPLY_TEMPLATES.map((t) => (
              <div key={t.label} className="border border-slate-200 rounded-lg p-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[12px] font-semibold text-slate-700">{t.label}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => sendTemplate(t, 'email')}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-blue-700 px-2 py-1 rounded-md hover:bg-blue-50 transition-colors"
                    >
                      <FiMail className="text-[11px]" /> Email
                    </button>
                    <button
                      type="button"
                      onClick={() => sendTemplate(t, 'whatsapp')}
                      disabled={!data.mobile}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-emerald-700 px-2 py-1 rounded-md hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <FiMessageCircle className="text-[11px]" /> WhatsApp
                    </button>
                  </div>
                </div>
                <p className="text-[12px] text-slate-500 leading-relaxed line-clamp-3">
                  {fillTemplate(t.body)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="inline-flex items-center gap-2 text-[13px] font-medium text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors disabled:opacity-60"
        >
          <FiTrash2 className="text-[14px]" /> {deleting ? 'Deleting…' : 'Delete'}
        </button>
        <button
          type="button"
          onClick={() => { if (dirty && !confirm('Discard unsaved changes?')) return; onClose(); }}
          className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-600 bg-white border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Close
        </button>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- */
/*  Small pieces                                                     */
/* ---------------------------------------------------------------- */

function Label({ children, className = '' }) {
  return (
    <span className={`block text-[10px] font-semibold uppercase tracking-wider text-slate-500 ${className}`}>
      {children}
    </span>
  );
}

function Field({ label, value, actions, mono = false }) {
  return (
    <div className="min-w-0">
      <Label>{label}</Label>
      <div className="flex items-center gap-2 mt-1">
        <span className={`text-[13px] text-slate-900 truncate ${mono ? 'font-mono tabular-nums' : ''}`}>
          {value || '—'}
        </span>
        {actions && (
          <span className="flex items-center gap-1 ml-auto opacity-70 hover:opacity-100 transition-opacity">{actions}</span>
        )}
      </div>
    </div>
  );
}

function ActionMini({ children, ...props }) {
  const Tag = props.href ? 'a' : 'button';
  const extra = props.href ? {} : { type: 'button' };
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

function SegmentButton({ active, Icon, label, tone = 'slate', ...props }) {
  const activeTone =
    tone === 'red'   ? 'bg-red-50 border-red-200 text-red-700' :
    tone === 'amber' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                       'bg-blue-50 border-blue-300 text-blue-700';
  return (
    <button
      type="button"
      {...props}
      className={[
        'inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1.5 rounded-md border transition-colors',
        active
          ? activeTone
          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50',
      ].join(' ')}
    >
      <Icon className="text-[12px]" />
      {label}
    </button>
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

function cap(s) { return String(s || '').replace(/^./, (c) => c.toUpperCase()); }

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
        <div className="space-y-2">
          {[0,1,2,3,4].map((i) => <SkeletonRow key={i} />)}
        </div>
      </div>
    </>
  );
}

export { isOverdue, waitedSince, waUrl };
