/**
 * Skeleton primitives — shimmer animation lives in index.css (.skel).
 *   <SkeletonText width="60%" />
 *   <SkeletonTile />     ← stat-card placeholder
 *   <SkeletonRow />      ← table row placeholder
 */
export function SkeletonText({ width = '100%', className = '' }) {
  return <div className={`skel skel-text ${className}`} style={{ width }} />;
}

export function SkeletonTile({ className = '' }) {
  return <div className={`skel skel-tile ${className}`} />;
}

export function SkeletonRow({ className = '' }) {
  return <div className={`skel skel-row ${className}`} />;
}

/** Composed skeleton for the dashboard home (header + stat row + table). */
export function DashboardHomeSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div className="space-y-2">
          <SkeletonText width="200px" />
          <SkeletonText width="320px" />
        </div>
        <SkeletonText width="180px" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonTile key={i} />)}
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 flex gap-3 items-center">
            <div className="skel w-8 h-8 rounded-lg" />
            <div className="flex-1 space-y-2">
              <SkeletonText width="60%" />
              <SkeletonText width="40%" />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <SkeletonText width="200px" />
        </div>
        <div className="p-4 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      </div>
    </div>
  );
}
