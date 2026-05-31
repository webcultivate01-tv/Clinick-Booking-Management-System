/**
 * Shared wrapper for the dashboard charts — same card vocabulary as every
 * other page (bg-white rounded-xl border slate-200, no shadow). Title /
 * subtitle in a slate-100 toolbar strip, body fills with Recharts.
 */
export default function ChartCard({ title, subtitle, icon: Icon, action, children, height = 280 }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-100">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Icon className="text-base" />
            </span>
          )}
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 text-[15px] truncate">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="p-4" style={{ width: '100%', height }}>{children}</div>
    </div>
  );
}
