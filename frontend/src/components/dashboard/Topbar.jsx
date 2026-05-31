import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AnimatePresence, motion } from 'framer-motion';
import { FiSearch, FiBell, FiUser, FiArrowUpRight, FiLogOut } from 'react-icons/fi';
import { api } from '../../api/axios';
import { logoutThunk, selectUser } from '../../store/authSlice';
import NotificationPanel from './NotificationPanel';

const PATH_TITLES = {
  '/dashboard':              'Dashboard',
  '/dashboard/today':        "Today's Bookings",
  '/dashboard/appointments': 'Appointments',
  '/dashboard/patients':     'Patients',
  '/dashboard/payments':     'Payments',
  '/dashboard/enquiries':    'Enquiries',
  '/dashboard/reviews':      'Reviews',
  '/dashboard/services':     'Services',
  '/dashboard/gallery':      'Gallery',
  '/dashboard/staff':        'Staff',
  '/dashboard/admins':       'Admins',
  '/dashboard/settings':     'Settings',
};

/**
 * Topbar — enterprise spec.
 *   bg-white border-b border-slate-200 px-8 py-3 flex items-center justify-between.
 *   Left: green pulse + "Live" + page title.
 *   Center: search input (bg-slate-50 → white on focus, Ctrl K kbd hint) —
 *     focusing it opens the Ctrl+K command palette.
 *   Right: 36×36 rounded-lg icon buttons (notifications); avatar tile + name/email + role chip.
 */
export default function Topbar({ onOpenPalette }) {
  const user = useSelector(selectUser);
  const dispatch = useDispatch();
  const location = useLocation();

  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);
  const [unread, setUnread]       = useState(0);
  const menuRef                   = useRef(null);

  const title = PATH_TITLES[location.pathname] || 'Dashboard';
  const initials = (user?.full_name || 'A')
    .split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  // Unread badge — actionable counts from dashboard-stats, refreshed every 60s.
  useEffect(() => {
    let cancel = false;
    const fetch = () => {
      const path = user?.role === 'admin' ? '/admin/dashboard-stats' : '/staff/dashboard-stats';
      api.get(path).then((res) => {
        if (cancel) return;
        const s = res.data || {};
        setUnread(
          (s.pending_count || 0)
          + (s.new_enquiries || 0)
          + (s.pending_reviews || 0)
          + (s.pending_payment_count || 0),
        );
      }).catch(() => !cancel && setUnread(0));
    };
    fetch();
    const t = setInterval(fetch, 60000);
    return () => { cancel = true; clearInterval(t); };
  }, [user?.role]);

  // User menu — click-outside close.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  return (
    <header className="bg-white border-b border-slate-200 px-8 py-3 flex items-center justify-between gap-4 sticky top-0 z-30">
      {/* Left: live + page title */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="dash-live-dot" aria-hidden />
        <span className="text-[11px] font-semibold tracking-wider uppercase text-emerald-600">Live</span>
        <span className="text-slate-300">|</span>
        <span className="text-[14px] font-semibold text-slate-900">{title}</span>
      </div>

      {/* Center: search — opens command palette */}
      <button
        type="button"
        onClick={onOpenPalette}
        className="group flex-1 max-w-[460px] mx-auto flex items-center gap-3 bg-slate-50 hover:bg-white border border-slate-200 hover:border-blue-300 rounded-lg px-3.5 py-2 text-left transition-colors"
        aria-label="Open command palette"
      >
        <FiSearch className="text-slate-400 text-[15px] shrink-0" />
        <span className="flex-1 text-[13px] text-slate-400 group-hover:text-slate-500 truncate">
          Search or jump to a page&hellip;
        </span>
        <kbd className="text-[10px] font-semibold bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-500 font-mono shrink-0">
          Ctrl K
        </kbd>
      </button>

      {/* Right: notifications + user */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="relative">
          <button
            type="button"
            onClick={() => { setNotifOpen((o) => !o); setMenuOpen(false); }}
            title="Notifications"
            aria-label="Notifications"
            className={[
              'w-9 h-9 rounded-lg flex items-center justify-center transition-colors relative',
              notifOpen
                ? 'bg-blue-50 text-blue-600 border border-slate-200'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-transparent',
            ].join(' ')}
          >
            <FiBell className="text-[15px]" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 border-2 border-white text-white text-[9px] font-bold leading-none flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
          <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
        </div>

        {/* User chip + dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => { setMenuOpen((o) => !o); setNotifOpen(false); }}
            className="flex items-center gap-3 pl-3 border-l border-slate-200 hover:opacity-90 transition-opacity"
          >
            <div className="text-right hidden sm:block">
              <div className="text-[13px] font-semibold text-slate-900 leading-tight">
                {user?.full_name || 'Admin User'}
              </div>
              <div className="text-[11px] text-slate-500 leading-tight mt-0.5 truncate max-w-[180px]">
                {user?.email}
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-semibold text-[12px] text-slate-700 tabular-nums">
              {initials}
            </div>
            <span
              className={[
                'hidden sm:inline-block text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded',
                user?.role === 'admin'
                  ? 'bg-blue-50 text-blue-700'
                  : 'bg-slate-100 text-slate-600',
              ].join(' ')}
            >
              {user?.role?.toUpperCase() || 'STAFF'}
            </span>
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 mt-2 w-60 bg-white border border-slate-200 rounded-xl overflow-hidden z-50"
              >
                <div className="px-4 py-3 border-b border-slate-100">
                  <div className="text-[13px] font-semibold text-slate-900 truncate">
                    {user?.full_name || 'Admin User'}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">{user?.email}</div>
                </div>
                <Link
                  to="/dashboard/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-slate-700 hover:bg-slate-50"
                >
                  <FiUser className="text-slate-400 text-[15px]" /> Profile & Settings
                </Link>
                <Link
                  to="/"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-slate-700 hover:bg-slate-50"
                >
                  <FiArrowUpRight className="text-slate-400 text-[15px]" /> Back to Site
                </Link>
                <div className="border-t border-slate-100" />
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); dispatch(logoutThunk()); }}
                  className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-red-600 hover:bg-red-50 w-full text-left"
                >
                  <FiLogOut className="text-[15px]" /> Logout
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
