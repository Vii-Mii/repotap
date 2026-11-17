import React, { useState } from 'react';
import { ArrowLeft, Filter } from 'lucide-react';
import ProblemRow from './ProblemRow.jsx';

const DIFFS = ['All', 'Easy', 'Medium', 'Hard'];

export default function SheetDetail({ sheet, progress, onBack, onToggle }) {
  const [statusFilter, setStatusFilter] = useState('all'); // all | todo | done
  const [diffFilter, setDiffFilter] = useState('All');

  const { total, solved, percent } = progress;

  const topics = progress.topics
    .map(topic => ({
      ...topic,
      problems: topic.problems.filter(p =>
        (diffFilter === 'All' || p.difficulty === diffFilter) &&
        (statusFilter === 'all' || (statusFilter === 'done' ? p.solved : !p.solved))
      ),
    }))
    .filter(topic => topic.problems.length > 0);

  return (
    <div className="animate-fade-in">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 pt-3 pb-2.5">
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={onBack}
            className="w-6 h-6 -ml-1 flex items-center justify-center rounded-md text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Back to sheets"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex-1 truncate">{sheet.title}</h2>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">{solved}</span>/{total}
          </span>
        </div>

        <div className="h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden mb-2">
          <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${percent}%` }} />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5">
          <Filter className="w-3 h-3 text-zinc-400" />
          <div className="flex rounded-lg bg-zinc-100 dark:bg-zinc-800 p-0.5">
            {['all', 'todo', 'done'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2 py-0.5 text-[10px] font-medium rounded-md transition-colors ${
                  statusFilter === s
                    ? 'bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400'
                }`}
              >
                {s === 'all' ? 'All' : s === 'todo' ? 'To do' : 'Done'}
              </button>
            ))}
          </div>
          <div className="flex rounded-lg bg-zinc-100 dark:bg-zinc-800 p-0.5 ml-auto">
            {DIFFS.map(d => (
              <button
                key={d}
                onClick={() => setDiffFilter(d)}
                className={`px-1.5 py-0.5 text-[10px] font-medium rounded-md transition-colors ${
                  diffFilter === d
                    ? 'bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400'
                }`}
              >
                {d === 'All' ? 'All' : d[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Topics */}
      <div className="p-3 space-y-3">
        {topics.length === 0 && (
          <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center py-6">No problems match these filters.</p>
        )}
        {topics.map(topic => (
          <div key={topic.name}>
            <div className="flex items-center justify-between px-1 mb-1">
              <h3 className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">{topic.name}</h3>
              <span className="text-[10px] text-zinc-400 tabular-nums">{topic.solved}/{topic.total}</span>
            </div>
            <div className="space-y-0.5">
              {topic.problems.map((problem, i) => (
                <ProblemRow
                  key={`${problem.slug || problem.title}-${i}`}
                  problem={problem}
                  onToggle={solved => onToggle(problem, solved)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}