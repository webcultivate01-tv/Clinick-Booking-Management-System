import Breadcrumbs from './Breadcrumbs';

/**
 * Standard page header (section 6.1 of the spec):
 *   H1: text-2xl font-semibold text-slate-900 tracking-tight
 *   Subtitle: text-[13px] text-slate-500 mt-1
 *   Actions: top-right
 * `crumbs={false}` hides breadcrumbs; otherwise they auto-derive from the URL.
 */
export default function PageHeader({ title, subtitle, crumbs, children }) {
  return (
    <div>
      {crumbs !== false && <Breadcrumbs items={crumbs || undefined} />}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{title}</h1>
          {subtitle && <p className="text-[13px] text-slate-500 mt-1">{subtitle}</p>}
        </div>
        {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}
      </div>
    </div>
  );
}
