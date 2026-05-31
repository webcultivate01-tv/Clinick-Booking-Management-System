import {
  FiCalendar, FiClock, FiCheckCircle, FiFlag,
  FiDollarSign, FiCreditCard, FiMessageSquare, FiStar, FiTrendingUp,
} from 'react-icons/fi';

/**
 * Spec-aligned stat card (matches the Invoices.jsx:340-349 reference exactly):
 *   bg-white rounded-xl border border-slate-200 p-5
 *   row: [label]  ◻ 32×32 colored icon tile
 *   value: text-xl font-semibold tabular-nums slate-900
 *
 * `accent` picks an (icon background / icon color) pair from the spec's
 * approved combos. `icon` is a Feather component name string; pass `iconNode`
 * to override with a custom React node.
 */
const ACCENTS = {
  blue:    'bg-blue-50 text-blue-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber:   'bg-amber-50 text-amber-600',
  indigo:  'bg-indigo-50 text-indigo-600',
  teal:    'bg-teal-50 text-teal-700',
  slate:   'bg-slate-100 text-slate-700',
  // Legacy aliases (still used by older callers).
  violet:  'bg-indigo-50 text-indigo-600',
  rose:    'bg-red-50 text-red-600',
};

const ICONS = {
  'fa-calendar-day':       FiCalendar,
  'fa-hourglass-half':     FiClock,
  'fa-circle-check':       FiCheckCircle,
  'fa-flag-checkered':     FiFlag,
  'fa-indian-rupee-sign':  FiDollarSign,
  'fa-credit-card':        FiCreditCard,
  'fa-comment-dots':       FiMessageSquare,
  'fa-star':               FiStar,
  'fa-chart-simple':       FiTrendingUp,
};

export default function StatCard({
  accent = 'blue',
  icon,
  iconNode,
  label,
  value,
  trend,
  trendTone = 'emerald',
}) {
  // Map legacy indigo → spec blue so callers that still pass accent="indigo" keep working.
  const tone = accent === 'indigo' ? 'blue' : accent;
  const iconCls = ACCENTS[tone] || ACCENTS.blue;
  const Icon = iconNode ? null : (ICONS[icon] || FiTrendingUp);

  const trendCls = trendTone === 'amber'
    ? 'bg-amber-50 text-amber-700'
    : trendTone === 'rose'
      ? 'bg-red-50 text-red-700'
      : 'bg-emerald-50 text-emerald-700';

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] font-medium text-slate-500">{label}</span>
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconCls}`}>
          {iconNode || <Icon className="text-base" />}
        </span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <p className="text-xl font-semibold text-slate-900 tabular-nums leading-tight">
          {value ?? '—'}
        </p>
        {trend && (
          <span className={`text-[11px] font-semibold rounded px-1.5 py-0.5 inline-flex items-center gap-1 ${trendCls}`}>
            <FiTrendingUp className="text-[10px]" /> {trend}
          </span>
        )}
      </div>
    </div>
  );
}
