import React from 'react';
import { Moon, Sun, GitBranch, Settings, Clock, Zap, X, LayoutDashboard } from 'lucide-react';

export default function Header({ page, setPage, theme, toggleTheme, pendingCount, autoSave, toggleAutoSave }) {
  const tabs = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'commit', icon: Zap, label: 'Commit', badge: pendingCount },
    { id: 'history', icon: Clock, label: 'History' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      {/* Logo row */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center">
            <GitBranch className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-zinc-900 dark:text-zinc-100">
            Repo<span className="text-brand-500">Tap</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {toggleAutoSave && (
            <button
              type="button"
              onClick={toggleAutoSave}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all border ${
                autoSave
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-700'
                  : 'bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
              }`}
              title={autoSave ? "Auto-Save is ON: accepted solutions commit directly to GitHub" : "Auto-Save is OFF: solutions are reviewed before committing"}
            >
              <Zap className={`w-2.5 h-2.5 ${autoSave ? 'fill-emerald-500 text-emerald-500' : ''}`} />
              <span>Auto-Save: {autoSave ? 'ON' : 'OFF'}</span>
            </button>
          )}

          <button
            onClick={toggleTheme}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => window.close()}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="Close RepoTap"
            aria-label="Close RepoTap"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex px-3 gap-1 pb-0 justify-between">
        {tabs.map(({ id, icon: Icon, label, badge }) => (
          <button
            key={id}
            onClick={() => setPage(id)}
            className={`
              flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-all relative
              ${page === id
                ? 'border-brand-500 text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20'
                : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
              }
            `}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
            {badge > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
