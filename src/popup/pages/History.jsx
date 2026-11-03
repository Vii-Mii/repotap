import React, { useState, useEffect } from 'react';
import { ExternalLink, Trash2, Clock } from 'lucide-react';
import { getHistory, clearHistory } from '../../lib/storage.js';
import { PLATFORM_META, formatDate } from '../../lib/utils.js';

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHistory().then(h => { setHistory(h); setLoading(false); });
  }, []);

  async function handleClear() {
    if (confirm('Clear all commit history? This only removes the local log, not your GitHub commits.')) {
      await clearHistory();
      setHistory([]);
    }
  }

  if (loading) {
    return (
      <div className="p-4 space-y-3 animate-pulse">
        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-zinc-100 dark:bg-zinc-800 rounded-xl" />)}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
        <Clock className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mb-3" />
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No commits yet</p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Your commit history will appear here.</p>
      </div>
    );
  }

  return (
    <div className="p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
          {history.length} commits
        </h2>
        <button
          onClick={handleClear}
          className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
        >
          <Trash2 className="w-3 h-3" />
          Clear log
        </button>
      </div>

      <div className="space-y-2">
        {history.map((entry, i) => {
          const platformMeta = PLATFORM_META[entry.platform] || {};
          return (
            <div
              key={i}
              className="flex items-center justify-between gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:border-brand-300 dark:hover:border-brand-700 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${platformMeta.bgClass} ${platformMeta.textClass}`}>
                    {platformMeta.label}
                  </span>
                  <span className="text-[10px] text-zinc-400">{formatDate(entry.committedAt)}</span>
                </div>
                <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">{entry.title}</p>
                <p className="text-[11px] text-zinc-400 font-mono mt-0.5">{entry.language} · {entry.timeComplexity || '?'} time</p>
              </div>

              {entry.commitUrl && (
                <a
                  href={entry.commitUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-brand-500 dark:hover:text-brand-400"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
