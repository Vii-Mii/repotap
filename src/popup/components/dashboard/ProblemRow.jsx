import React from 'react';
import { Check, ExternalLink } from 'lucide-react';
import { problemUrl } from '../../../lib/sheets.js';

const DIFF_BADGE = {
  Easy: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
  Medium: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
  Hard: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800',
};

const SOURCE_LABEL = {
  auto: 'auto',
  backfill: 'history',
  manual: 'manual',
};

export default function ProblemRow({ problem, onToggle }) {
  const url = problemUrl(problem);
  return (
    <div
      className={`flex items-center gap-2 py-1.5 px-2 rounded-lg transition-colors ${
        problem.solved
          ? 'bg-emerald-50/50 dark:bg-emerald-950/20'
          : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
      }`}
    >
      <button
        onClick={() => onToggle(!problem.solved)}
        aria-label={problem.solved ? `Mark ${problem.title} as unsolved` : `Mark ${problem.title} as solved`}
        className={`w-4 h-4 flex-shrink-0 rounded border flex items-center justify-center transition-colors ${
          problem.solved
            ? 'bg-emerald-500 border-emerald-500 text-white'
            : 'border-zinc-300 dark:border-zinc-600 hover:border-emerald-500'
        }`}
      >
        {problem.solved && <Check className="w-3 h-3" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-xs truncate hover:underline ${problem.solved ? 'text-zinc-400 dark:text-zinc-500 line-through' : 'text-zinc-700 dark:text-zinc-300'}`}
            >
              {problem.title}
            </a>
          ) : (
            <span className={`text-xs truncate ${problem.solved ? 'text-zinc-400 dark:text-zinc-500 line-through' : 'text-zinc-700 dark:text-zinc-300'}`}>
              {problem.title}
            </span>
          )}
          {url && <ExternalLink className="w-2.5 h-2.5 text-zinc-300 dark:text-zinc-600 flex-shrink-0" />}
        </div>
        {problem.solved && problem.solvedAt && (
          <p className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-0.5">
            solved {problem.solvedAt}{problem.source ? ` · ${SOURCE_LABEL[problem.source] || problem.source}` : ''}
          </p>
        )}
      </div>

      <span className={`flex-shrink-0 text-[9px] font-medium px-1.5 py-0.5 rounded border ${DIFF_BADGE[problem.difficulty] || DIFF_BADGE.Medium}`}>
        {problem.difficulty || 'Medium'}
      </span>
    </div>
  );
}