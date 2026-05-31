import { FiInbox } from 'react-icons/fi';

/**
 * Friendly empty state used inside dashboard tables/cards when there's
 * nothing to show. Spec-aligned: slate-300 dim icon, slate-900 title,
 * slate-500 body. Pass any Feather icon component as `Icon`.
 */
export default function EmptyState({ Icon = FiInbox, title, description, action }) {
  return (
    <div className="text-center py-14 px-6">
      <div className="w-12 h-12 mx-auto rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
        <Icon className="text-xl" />
      </div>
      <h3 className="font-semibold text-slate-900 text-[15px]">{title}</h3>
      {description && <p className="text-[13px] text-slate-500 mt-1 max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
