import React from 'react';
import { ChevronRight } from 'lucide-react';

const DIFF_STYLES = {
  Easy: 'text-emerald-600 dark:text-emerald-400',
  Medium: 'text-amber-600 dark:text-amber-400',
  Hard: 'text-red-600 dark:text-red-400',
};

export default function SheetCard({ sheet, progress, onClick }) {
  const { total, solved, percent, byDifficulty } = progress;

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:border-brand-300 dark:hover:border-brand-700 transition-colors group"
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
          {sheet.title}
        </span>
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">{solved}</span>/{total}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600 group-hover:text-brand-400 transition-colors" />
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-500 rounded-full transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Difficulty breakdown */}
      <div className="flex items-center gap-3 mt-1.5">
        {['Easy', 'Medium', 'Hard'].map(diff => {
          const d = byDifficulty[diff];
          if (!d) return null;
          return (
            <span key={diff} className={`text-[10px] tabular-nums ${DIFF_STYLES[diff]}`}>
              {diff[0]} <span className="text-zinc-400 dark:text-zinc-500">{d.solved}/{d.total}</span>
            </span>
          );
        })}
      </div>
    </button>
  );
}