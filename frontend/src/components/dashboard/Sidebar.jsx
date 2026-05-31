import { useEffect, useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { MdLocalShipping } from 'react-icons/md';
import { FiArrowLeft, FiLogOut, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { api } from '../../api/axios';
import { logoutThunk, selectUser } from '../../store/authSlice';
import { NAV_SECTIONS, canSee } from './navConfig';

/**
 * Sidebar — enterprise spec.
 *   w-64 white panel, slate-200 right border, flex col.
 *   Brand block: 36×36 slate-900 tile + GOBOXLY-style wordmark + tag.
 *   Sections grouped by `text-[10px] tracking-[0.14em] uppercase text-slate-400`.
 *   Nav item: slate-600 idle, blue-50 / blue-700 active + 2px blue left bar.
 *   Badges (when surfaced): slate (default), blue (active), red-pulse (live).
 *   Footer: Back to Site (slate) + Logout (red).
 */
export default function Sidebar({ collapsed = false, onToggleCollapsed }) {
  const user = useSelector(selectUser);
  const dispatch = useDispatch();
  const isAdmin = user?.role === 'admin';

  // Surface live/pending counts as badges on nav items. Refresh every 60s.
  const [counts, setCounts] = useState({});
  useEffect(() => {
    let cancel = false;
    const path = isAdmin ? '/admin/dashboard-stats' : '/staff/dashboard-stats';
    const run = () => api.get(path).then((r) => {
      if (cancel) return;
      const s = r.data || {};
      setCounts({
        '/dashboard/today':        s.today_count || 0,
        '/dashboard/appointments': s.pending_count || 0,
        '/dashboard/enquiries':    isAdmin ? 0 : (s.new_enquiries || 0),
        '/dashboard/reviews':      isAdmin ? 0 : (s.pending_reviews || 0),
        '/dashboard/payments':     s.pending_payment_count || 0,
      });
    }).catch(() => {});
    run();
    const t = setInterval(run, 60000);
    return () => { cancel = true; clearInterval(t); };
  }, [isAdmin]);

  return (
    <aside
      className={[
        'fixed inset-y-0 left-0 z-40 bg-white border-r border-slate-200 flex flex-col shrink-0',
        'transition-[width] duration-200',
        collapsed ? 'w-[4.5rem]' : 'w-64',
      ].join(' ')}
    >
      {/* Brand */}
      <Link to="/admin" className="flex items-center gap-3 px-4 h-[57px] border-b border-slate-200 shrink-0">
        <div className="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center text-white shrink-0">
          <MdLocalShipping className="text-[18px]" />
        </div>
        {!collapsed && (
          <div className="leading-tight min-w-0">
            <div className="text-[15px] font-black tracking-wider text-slate-900 truncate">
              LUMIÈRE
            </div>
            <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400 mt-0.5">
              Admin Console
            </div>
          </div>
        )}
      </Link>

      {/* Collapse toggle */}
      <button
        type="button"
        onClick={onToggleCollapsed}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="absolute top-[42px] -right-3 w-6 h-6 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-blue-600 flex items-center justify-center z-50 transition-colors"
      >
        {collapsed ? <FiChevronRight className="text-[12px]" /> : <FiChevronLeft className="text-[12px]" />}
      </button>

      {/* Nav */}
      <nav className="dash-scroll flex-1 overflow-y-auto py-3">
        {NAV_SECTIONS.map((section) => {
          const visible = section.items.filter((i) => canSee(i, user?.role));
          if (!visible.length) return null;

          return (
            <div key={section.label} className="mb-1">
              {!collapsed && (
                <div className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  {section.label}
                </div>
              )}
              {collapsed && <div className="mx-3 my-2 border-t border-slate-100" />}

              {visible.map((item) => {
                const Icon = item.icon;
                const count = counts[item.to] || 0;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) => [
                      'relative flex items-center gap-3 mx-2 px-3 py-2 rounded-md text-[13px] font-medium transition-colors',
                      collapsed ? 'justify-center' : '',
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                    ].join(' ')}
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span
                            aria-hidden
                            className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r bg-blue-600"
                          />
                        )}
                        <Icon
                          className={`text-[15px] shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`}
                        />
                        {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                        {!collapsed && count > 0 && (
                          <span
                            className={[
                              'text-[10px] font-semibold rounded-full px-1.5 py-0.5 min-w-[20px] text-center',
                              item.live
                                ? 'bg-red-500 text-white animate-pulse'
                                : isActive
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-slate-100 text-slate-500',
                            ].join(' ')}
                          >
                            {count > 99 ? '99+' : count}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-200 p-2 space-y-0.5">
        <Link
          to="/"
          title={collapsed ? 'Back to Site' : undefined}
          className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''} mx-1 px-3 py-2 rounded-md text-[13px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors`}
        >
          <FiArrowLeft className="text-[15px] text-slate-400 shrink-0" />
          {!collapsed && <span>Back to Site</span>}
        </Link>
        <button
          type="button"
          onClick={() => dispatch(logoutThunk())}
          title={collapsed ? 'Logout' : undefined}
          className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''} mx-1 px-3 py-2 rounded-md text-[13px] font-medium text-red-600 hover:bg-red-50 transition-colors w-[calc(100%-0.5rem)] text-left`}
        >
          <FiLogOut className="text-[15px] shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
