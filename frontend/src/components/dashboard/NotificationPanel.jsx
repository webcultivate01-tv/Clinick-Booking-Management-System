import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FiClock, FiMessageSquare, FiStar, FiCreditCard, FiCalendar,
  FiChevronRight, FiBellOff, FiX,
} from 'react-icons/fi';
import { api } from '../../api/axios';
import { selectUser } from '../../store/authSlice';

/**
 * Topbar notification dropdown. Surfaces actionable items derived from
 * dashboard-stats counters — pending appointments, new enquiries, pending
 * reviews, pending payments. Each row deep-links to the relevant page.
 * Spec-aligned: white surface, slate-200 border, no shadow, slate hovers.
 */
export default function NotificationPanel({ open, onClose }) {
  const user = useSelector(selectUser);
  const isAdmin = user?.role === 'admin';
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(true);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const path = isAdmin ? '/admin/dashboard-stats' : '/staff/dashboard-stats';
    api.get(path)
      .then((res) => {
        const s = res.data || {};
        const list = [];
        if (s.pending_count > 0) list.push({
          tone: 'amber', Icon: FiClock,
          title: `${s.pending_count} pending appointment${s.pending_count === 1 ? '' : 's'}`,
          sub:   'Awaiting confirmation',
          to:    '/dashboard/appointments?status=pending',
        });
        const newE = s.new_enquiries ?? 0;
        if (newE > 0) list.push({
          tone: 'blue', Icon: FiMessageSquare,
          title: `${newE} new enquir${newE === 1 ? 'y' : 'ies'}`,
          sub:   'Inbound contact-form messages',
          to:    '/dashboard/enquiries?status=new',
        });
        if (s.pending_reviews > 0) list.push({
          tone: 'blue', Icon: FiStar,
          title: `${s.pending_reviews} review${s.pending_reviews === 1 ? '' : 's'} to moderate`,
          sub:   'Pending approval',
          to:    '/dashboard/reviews?status=pending',
        });
        if (isAdmin && s.pending_payment_count > 0) list.push({
          tone: 'rose', Icon: FiCreditCard,
          title: `${s.pending_payment_count} pending payment${s.pending_payment_count === 1 ? '' : 's'}`,
          sub:   'Awaiting collection or refund',
          to:    '/dashboard/payments?status=pending',
        });
        if (s.today_count > 0) list.push({
          tone: 'emerald', Icon: FiCalendar,
          title: `${s.today_count} appointment${s.today_count === 1 ? '' : 's'} today`,
          sub:   'View live queue',
          to:    '/dashboard/today',
        });
        setItems(list);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [open, isAdmin]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, onClose]);

  const TONES = {
    blue:    'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber:   'bg-amber-50 text-amber-600',
    rose:    'bg-red-50 text-red-600',
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          className="absolute right-0 mt-2 w-[360px] max-h-[70vh] bg-white border border-slate-200 rounded-xl overflow-hidden z-50 flex flex-col"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.12 }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
            <h4 className="text-[13px] font-semibold text-slate-900">Notifications</h4>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-7 h-7 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 flex items-center justify-center transition-colors"
            >
              <FiX className="text-[14px]" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
            {loading && (
              <div className="p-4 space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex gap-3 items-center">
                    <div className="skel w-8 h-8 rounded-lg" />
                    <div className="flex-1 space-y-1.5">
                      <div className="skel skel-text" style={{ width: '70%' }} />
                      <div className="skel skel-text" style={{ width: '45%' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && items?.length === 0 && (
              <div className="px-6 py-12 text-center">
                <FiBellOff className="text-2xl mx-auto text-slate-300 mb-2" />
                <p className="text-[13px] text-slate-500">You&rsquo;re all caught up.</p>
              </div>
            )}

            {!loading && items?.map((it, i) => (
              <Link
                key={i}
                to={it.to}
                onClick={onClose}
                className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
              >
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${TONES[it.tone] || TONES.blue}`}>
                  <it.Icon className="text-[14px]" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-medium text-slate-900 truncate">{it.title}</span>
                  <span className="block text-[11px] text-slate-500 mt-0.5 truncate">{it.sub}</span>
                </span>
                <FiChevronRight className="text-[12px] text-slate-300 self-center shrink-0" />
              </Link>
            ))}
          </div>

          <Link
            to="/dashboard"
            onClick={onClose}
            className="px-4 py-3 border-t border-slate-100 bg-slate-50 text-center text-[13px] font-medium text-blue-600 hover:text-blue-700 hover:bg-slate-100 transition-colors"
          >
            Go to Dashboard
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
