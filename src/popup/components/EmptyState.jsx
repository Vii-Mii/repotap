import React from 'react';
import { CheckCircle2, Settings } from 'lucide-react';

export default function EmptyState({ setPage }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-fade-in">
      <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mb-4">
        <CheckCircle2 className="w-7 h-7 text-green-500 dark:text-green-400" />
      </div>
      <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 mb-1.5">
        No pending solutions
      </h3>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-[220px]">
        Solve a problem on LeetCode, HackerRank, or GeeksForGeeks and come back when it's accepted.
      </p>
      <button
        onClick={() => setPage('settings')}
        className="mt-5 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-brand-500 dark:hover:text-brand-400 transition-colors"
      >
        <Settings className="w-3.5 h-3.5" />
        Configure GitHub settings
      </button>
    </div>
  );
}
