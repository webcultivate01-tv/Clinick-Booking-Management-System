import { useCallback, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import CommandPalette from './CommandPalette';

const COLLAPSE_KEY = 'dash:sidebar-collapsed';

/**
 * Admin shell — bg-[#F7F8FA] root, fixed sidebar offsetting the main column,
 * sticky topbar, scrollable content (px-8 py-6, the spec's outer rhythm).
 *
 * Layout owns the sidebar-collapsed state (localStorage-backed) and the
 * Ctrl/Cmd+K command palette toggle.
 */
export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; }
  });
  const [paletteOpen, setPaletteOpen] = useState(false);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0'); } catch {}
      return next;
    });
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-slate-700 font-sans">
      <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />

      <div
        className={[
          'transition-[padding-left] duration-200',
          collapsed ? 'pl-[4.5rem]' : 'pl-64',
        ].join(' ')}
      >
        <Topbar onOpenPalette={() => setPaletteOpen(true)} />
        <main className="px-6 lg:px-8 py-6">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
