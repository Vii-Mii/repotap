import React, { useEffect } from 'react';
import { CheckCircle2, ExternalLink } from 'lucide-react';

export default function CommitSuccess({ result, onDone, remaining }) {
  // Hold the confirmation long enough to read, then return to the list
  useEffect(() => {
    const t = setTimeout(onDone, 6000);
    return () => clearTimeout(t);
  }, [result]);

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center animate-fade-in">
      <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mb-4">
        <CheckCircle2 className="w-7 h-7 text-green-500" />
      </div>
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Committed successfully!</h3>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">{result.title}</p>
      <p className="text-[11px] font-mono text-zinc-400 mb-4 break-all">
        {result.repo ? `${result.repo}/` : ''}{result.path}
      </p>
      {result.url && (
        <a
          href={result.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-brand-500 hover:text-brand-600 dark:hover:text-brand-400 transition-colors mb-4"
        >
          View on GitHub <ExternalLink className="w-3 h-3" />
        </a>
      )}
      <button
        type="button"
        onClick={onDone}
        className="py-1.5 px-4 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold rounded-xl transition-colors"
      >
        {remaining > 0 ? `Continue (${remaining} pending)` : 'Done'}
      </button>
    </div>
  );
}
