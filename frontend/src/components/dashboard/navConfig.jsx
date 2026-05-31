import {
  FiGrid, FiZap, FiCalendar, FiCreditCard,
  FiUsers, FiMessageSquare, FiStar,
  FiPackage, FiImage, FiUser, FiShield, FiSettings, FiClock,
} from 'react-icons/fi';

/**
 * Single source of truth for the dashboard nav — shared by the Sidebar and
 * the Ctrl+K command palette. `roles` (optional) restricts visibility.
 *
 * Icons are Feather (react-icons/fi) per the enterprise spec. Each item gets
 * a React node so the consumer can size it in context (e.g. text-[15px] in
 * the sidebar, text-base in the palette).
 */
export const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard',              label: 'Dashboard',        icon: FiGrid,           end: true,
        desc: 'Stats, charts and today at a glance' },
    ],
  },
  {
    label: 'Bookings',
    items: [
      { to: '/dashboard/today',        label: "Today's Bookings", icon: FiZap,
        desc: 'Live queue ordered by booking time', live: true },
      { to: '/dashboard/appointments', label: 'Appointments',     icon: FiCalendar,
        desc: 'All upcoming and past appointments' },
      { to: '/dashboard/opd',          label: 'OPD Schedule',     icon: FiClock,
        desc: 'Clinic hours, slot duration and closed days' },
      { to: '/dashboard/payments',     label: 'Payments',         icon: FiCreditCard, roles: ['admin'],
        desc: 'Revenue, refunds and reconciliation' },
    ],
  },
  {
    label: 'Customers',
    items: [
      { to: '/dashboard/patients',     label: 'Patients',         icon: FiUsers, roles: ['admin'],
        desc: 'Patient directory and treatment history' },
      { to: '/dashboard/enquiries',    label: 'Enquiries',        icon: FiMessageSquare,
        desc: 'Inbound contact-form enquiries' },
      { to: '/dashboard/reviews',      label: 'Reviews',          icon: FiStar,
        desc: 'Moderate and publish customer reviews' },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { to: '/dashboard/services',     label: 'Services',         icon: FiPackage, roles: ['admin'],
        desc: 'Treatment menu, pricing and slots' },
      { to: '/dashboard/gallery',      label: 'Gallery',          icon: FiImage,
        desc: 'Before & after gallery for the public site' },
    ],
  },
  {
    label: 'Team',
    items: [
      { to: '/dashboard/staff',        label: 'Staff',            icon: FiUser,   roles: ['admin'],
        desc: 'Staff accounts and access' },
      { to: '/dashboard/admins',       label: 'Admins',           icon: FiShield, roles: ['admin'],
        desc: 'Admin accounts and permissions' },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/dashboard/settings',     label: 'Settings',         icon: FiSettings,
        desc: 'Profile, password and clinic preferences' },
    ],
  },
];

export const canSee = (item, role) => !item.roles || item.roles.includes(role);
