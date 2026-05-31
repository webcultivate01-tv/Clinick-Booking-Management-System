import { Link, useLocation } from 'react-router-dom';
import { FiChevronRight, FiHome } from 'react-icons/fi';

const SEGMENT_LABEL = {
  dashboard:    'Dashboard',
  today:        "Today's Bookings",
  appointments: 'Appointments',
  patients:     'Patients',
  payments:     'Payments',
  enquiries:    'Enquiries',
  reviews:      'Reviews',
  services:     'Services',
  gallery:      'Gallery',
  staff:        'Staff',
  admins:       'Admins',
  settings:     'Settings',
};

/**
 * Compact breadcrumb row above the page title. Auto-derives from the URL when
 * `items` isn't passed (each crumb is `{ label, to? }`).
 */
export default function Breadcrumbs({ items }) {
  const location = useLocation();

  const crumbs = items || (() => {
    const parts = location.pathname.split('/').filter(Boolean);
    const acc = []; let path = '';
    parts.forEach((p) => { path += `/${p}`; acc.push({ label: SEGMENT_LABEL[p] || p, to: path }); });
    return acc;
  })();

  if (!crumbs.length) return null;

  return (
    <nav className="flex items-center gap-1.5 text-[12px] text-slate-500 mb-2" aria-label="Breadcrumb">
      <FiHome className="text-[12px] text-slate-400" />
      {crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={`${c.to || c.label}-${i}`} className="flex items-center gap-1.5">
            <FiChevronRight className="text-[10px] text-slate-300" />
            {isLast || !c.to
              ? <span className="text-slate-700 font-medium">{c.label}</span>
              : <Link to={c.to} className="hover:text-blue-600 transition-colors">{c.label}</Link>}
          </span>
        );
      })}
    </nav>
  );
}
