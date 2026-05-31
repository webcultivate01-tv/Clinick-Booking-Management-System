import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { AnimatePresence, motion } from 'framer-motion';
import { FiSearch, FiCornerDownLeft, FiFolder } from 'react-icons/fi';
import { selectUser } from '../../store/authSlice';
import { NAV_SECTIONS, canSee } from './navConfig';

/**
 * Spotlight-style quick navigator. Opens on Ctrl+K (handled at the layout
 * level), closes on Escape or backdrop click. ↑/↓ to move, Enter to navigate.
 * Spec-aligned: white surface, slate-200 border, no shadow, blue-50 hover.
 */
export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return NAV_SECTIONS
      .map((s) => ({
        ...s,
        items: s.items.filter(
          (i) => canSee(i, user?.role)
            && (!q || i.label.toLowerCase().includes(q) || (i.desc || '').toLowerCase().includes(q)),
        ),
      }))
      .filter((s) => s.items.length > 0);
  }, [query, user?.role]);

  const flatItems = useMemo(() => filtered.flatMap((s) => s.items), [filtered]);

  useEffect(() => { setActiveIdx(0); }, [query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  const handleKey = (e) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      const target = flatItems[activeIdx];
      if (target) { navigate(target.to); onClose(); }
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="dash-kbar-overlay"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          onKeyDown={handleKey}
        >
          <motion.div
            className="dash-kbar"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200">
              <FiSearch className="text-slate-400 text-[16px]" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search pages…"
                onKeyDown={handleKey}
                className="flex-1 bg-transparent border-0 outline-none text-[14px] text-slate-900 placeholder:text-slate-400"
              />
              <kbd className="text-[10px] font-semibold bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded text-slate-500 font-mono">
                ESC
              </kbd>
            </div>

            <div className="overflow-y-auto py-1.5">
              {flatItems.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <FiFolder className="text-2xl mx-auto text-slate-300 mb-2" />
                  <p className="text-[13px] text-slate-500">
                    No matches for &ldquo;{query}&rdquo;
                  </p>
                </div>
              ) : (
                filtered.map((section) => (
                  <div key={section.label}>
                    <div className="px-4 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      {section.label}
                    </div>
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const flatIndex = flatItems.indexOf(item);
                      const isActive = flatIndex === activeIdx;
                      return (
                        <button
                          type="button"
                          key={item.to}
                          onMouseEnter={() => setActiveIdx(flatIndex)}
                          onClick={() => { navigate(item.to); onClose(); }}
                          className={[
                            'w-full text-left flex items-center gap-3 mx-1.5 px-3 py-2 rounded-md transition-colors',
                            isActive
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-slate-700 hover:bg-slate-50',
                          ].join(' ')}
                        >
                          <span
                            className={[
                              'w-7 h-7 rounded-md flex items-center justify-center shrink-0',
                              isActive ? 'bg-white text-blue-600' : 'bg-slate-50 text-slate-500',
                            ].join(' ')}
                          >
                            <Icon className="text-[14px]" />
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-[13px] font-medium truncate">{item.label}</span>
                            {item.desc && (
                              <span className="block text-[11px] text-slate-500 truncate">{item.desc}</span>
                            )}
                          </span>
                          {isActive && <FiCornerDownLeft className="text-[12px] text-blue-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
