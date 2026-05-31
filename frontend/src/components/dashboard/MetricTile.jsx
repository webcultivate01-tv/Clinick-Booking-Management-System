import {
  FiDollarSign, FiCreditCard, FiMessageSquare, FiStar, FiTrendingUp,
} from 'react-icons/fi';

/**
 * Compact secondary metric (used in the row beneath the primary StatCards).
 * Same visual language as StatCard but tighter padding and smaller number.
 */
const TONES = {
  blue:    'bg-blue-50 text-blue-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber:   'bg-amber-50 text-amber-600',
  indigo:  'bg-indigo-50 text-indigo-600',
  teal:    'bg-teal-50 text-teal-700',
  slate:   'bg-slate-100 text-slate-700',
  rose:    'bg-red-50 text-red-600',
};

const ICONS = {
  'fa-indian-rupee-sign': FiDollarSign,
  'fa-credit-card':       FiCreditCard,
  'fa-comment-dots':      FiMessageSquare,
  'fa-star':              FiStar,
};

export default function MetricTile({ icon, iconNode, label, value, accent = 'blue' }) {
  const tone = accent === 'indigo' ? 'blue' : accent;
  const Icon = iconNode ? null : (ICONS[icon] || FiTrendingUp);
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${TONES[tone] || TONES.blue}`}>
        {iconNode || <Icon className="text-base" />}
      </span>
      <div className="min-w-0">
        <div className="text-[11px] font-medium text-slate-500 truncate">{label}</div>
        <div className="text-[15px] font-semibold text-slate-900 tabular-nums leading-tight mt-0.5">
          {value ?? '—'}
        </div>
      </div>
    </div>
  );
}
