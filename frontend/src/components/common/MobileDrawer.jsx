import { useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';

export default function MobileDrawer({ open, onClose, nav }) {
  const location = useLocation();

  // Close drawer on route change.
  useEffect(() => { onClose(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [location.pathname]);

  // Lock body scroll while drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      <div
        className={`drawer-overlay ${open ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`mobile-drawer ${open ? 'open' : ''}`} role="dialog" aria-modal="true">
        <div className="drawer-header">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-700 to-amber-500 flex items-center justify-center">
              <i className="fa-solid fa-spa text-white text-xs"></i>
            </div>
            <span className="font-heading text-base font-semibold text-brown">
              Lumière <span className="text-gold font-heading">Radiant Skin</span>
            </span>
          </div>
          <button onClick={onClose} className="drawer-close" aria-label="Close menu">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <nav className="drawer-nav">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <i className={`fa-solid ${item.icon}`}></i> {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="drawer-footer">
          <Link
            to="/appointment"
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <i className="fa-regular fa-calendar-check"></i> Book Consultation
          </Link>
        </div>
      </aside>
    </>
  );
}
