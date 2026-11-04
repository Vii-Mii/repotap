import React, { useState, useEffect } from 'react';
import {
  GitCommitHorizontal,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  X,
  Folder,
} from 'lucide-react';
import TagSelector from '../components/TagSelector.jsx';
import ComplexityPicker from '../components/ComplexityPicker.jsx';
import { PLATFORM_META, DIFFICULTY_COLORS } from '../../lib/utils.js';
import { resolveExtension } from '../../lib/language.js';
import { removePendingById, removePendingSolution } from '../../lib/storage.js';

const VERSION_OPTIONS = [
  {
    id: 'override',
    label: '✏️ Override File',
    desc: 'Replace the existing file completely with this solution',
  },
  {
    id: 'new_version',
    label: '📄 Append New Version',
    desc: 'Keep existing code and add this solution below (separated by -----------------)',
  },
];

export default function CommitReview({ pending, onCommitted, onDismiss }) {
  const [selected, setSelected] = useState(0);
  const [showCode, setShowCode] = useState(false);
  const [targetDirectory, setTargetDirectory] = useState('');
  const [repoInfo, setRepoInfo] = useState('');
  const [baseDir, setBaseDir] = useState('');
  const [metadata, setMetadata] = useState({
    timeComplexity: '',
    spaceComplexity: '',
    approach: '',
    notes: '',
    customMessage: '',
    tags: [],
  });
  const [versionMode, setVersionMode] = useState('override');
  const [status, setStatus] = useState('idle'); // idle | loading | error
  const [errorMsg, setErrorMsg] = useState('');

  // Keep selected index within bounds
  const activeIndex = Math.min(selected, Math.max(0, pending.length - 1));
  const solution = pending[activeIndex];

  // Load repo info & default base directory from settings
  useEffect(() => {
    chrome.storage.local.get('rt_settings', (res) => {
      const s = res.rt_settings || {};
      if (s.repoFullName) setRepoInfo(s.repoFullName);
      if (s.baseDir) {
        setBaseDir(s.baseDir);
        setTargetDirectory(d => d || s.baseDir);
      }
    });
  }, []);

  if (!solution) return null;

  const platformMeta = PLATFORM_META[solution.platform] || {};
  const diff = (solution.difficulty || '').toLowerCase();
  const diffColor = DIFFICULTY_COLORS[diff] || DIFFICULTY_COLORS.unknown;
  const ext = resolveExtension(solution);
  const previewPath = `${targetDirectory ? targetDirectory.replace(/^\/+|\/+$/g, '') + '/' : ''}${solution.slug}.${ext}`;

  function resetForm() {
    setMetadata({
      timeComplexity: '',
      spaceComplexity: '',
      approach: '',
      notes: '',
      customMessage: '',
      tags: [],
    });
    setVersionMode('override');
    setShowCode(false);
    setStatus('idle');
    setErrorMsg('');
    setTargetDirectory(baseDir);
  }

  function updateMeta(key, val) {
    setMetadata(m => ({ ...m, [key]: val }));
  }

  // Cross / Dismiss problem
  async function handleDismiss(solToDismiss, e) {
    if (e) e.stopPropagation();
    try {
      if (solToDismiss.id) {
        await removePendingById(solToDismiss.id);
      } else {
        await removePendingSolution(solToDismiss.slug, solToDismiss.platform);
      }
      resetForm();
      if (onDismiss) {
        onDismiss(solToDismiss);
      } else if (onCommitted) {
        onCommitted();
      }
    } catch (err) {
      console.error('Failed to dismiss:', err);
    }
  }

  async function handleCommit() {
    setStatus('loading');
    setErrorMsg('');

    try {
      const result = await chrome.runtime.sendMessage({
        type: 'COMMIT_SOLUTION',
        payload: {
          solution,
          metadata,
          targetDirectory,
          versionMode,
        },
      });

      if (result?.success) {
        const info = {
          title: solution.title,
          path: result.filePath || previewPath,
          url: result.commitUrl,
          repo: repoInfo,
        };
        resetForm();
        onCommitted(info);
      } else {
        setStatus('error');
        setErrorMsg(result?.error || 'Commit failed. Check GitHub settings.');
      }
    } catch (e) {
      setStatus('error');
      setErrorMsg(e.message);
    }
  }

  return (
    <div className="p-4 space-y-3.5 animate-slide-up">
      {/* Multiple problem tabs */}
      {pending.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {pending.map((s, i) => (
            <div
              key={s.id || `${s.platform}-${s.slug}-${i}`}
              onClick={() => setSelected(i)}
              className={`
                flex items-center gap-1.5 flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium border cursor-pointer transition-all
                ${i === activeIndex
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400'
                }
              `}
            >
              <span>{s.title.length > 16 ? s.title.slice(0, 16) + '…' : s.title}</span>
              <button
                type="button"
                onClick={(e) => handleDismiss(s, e)}
                title="Dismiss solution"
                className="hover:opacity-75 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Problem Card with Dismiss X Button */}
      <div className="relative bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700">
        {/* Dismiss Cross Button */}
        <button
          type="button"
          onClick={(e) => handleDismiss(solution, e)}
          title="Dismiss this solution"
          className="absolute top-2.5 right-2.5 w-6 h-6 flex items-center justify-center rounded-md text-zinc-400 hover:text-red-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="pr-8">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{solution.title}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${platformMeta.bgClass} ${platformMeta.textClass}`}>
              {platformMeta.label}
            </span>
            {solution.difficulty && (
              <span className={`text-[11px] font-medium capitalize ${diffColor}`}>
                {solution.difficulty}
              </span>
            )}
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">{solution.language}</span>
          </div>
        </div>

        {/* Code preview toggle */}
        <div className="mt-2.5 pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowCode(!showCode)}
            className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400 hover:text-brand-500 transition-colors"
          >
            {showCode ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {showCode ? 'Hide solution code' : 'Preview code'}
          </button>
          {solution.stats?.runtime && (
            <span className="text-[10px] text-zinc-400 font-mono">
              ⚡ {solution.stats.runtime} {solution.stats.memory ? `• ${solution.stats.memory}` : ''}
            </span>
          )}
        </div>

        {showCode && (
          <div className="mt-2 bg-zinc-900 dark:bg-zinc-950 rounded-lg p-2.5 max-h-36 overflow-y-auto scrollbar-thin">
            <pre className="text-[11px] font-mono text-zinc-300 whitespace-pre-wrap break-words leading-relaxed">
              {solution.code || '// Code captured from editor'}
            </pre>
          </div>
        )}
      </div>

      {/* Directory / Path Input */}
      <div>
        <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1 flex items-center gap-1">
          <Folder className="w-3 h-3 text-brand-500" />
          Target Directory / Category
        </label>
        <div className="relative">
          <input
            type="text"
            placeholder="e.g. two-pointer or algorithms"
            value={targetDirectory}
            onChange={e => setTargetDirectory(e.target.value)}
            className="w-full text-xs font-mono px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none focus:border-brand-400 dark:focus:border-brand-500 text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 transition-colors"
          />
        </div>
        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 truncate">
          Commit destination: <span className="font-mono text-zinc-600 dark:text-zinc-300">{repoInfo ? `${repoInfo}/` : ''}{previewPath}</span>
        </p>
      </div>

      {/* Complexity */}
      <div className="grid grid-cols-2 gap-2">
        <ComplexityPicker
          label="Time Complexity"
          value={metadata.timeComplexity}
          onChange={v => updateMeta('timeComplexity', v)}
        />
        <ComplexityPicker
          label="Space Complexity"
          value={metadata.spaceComplexity}
          onChange={v => updateMeta('spaceComplexity', v)}
        />
      </div>

      {/* Approach */}
      <div>
        <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">Approach (optional)</label>
        <textarea
          rows={2}
          placeholder="e.g. Hash map complement lookup, sliding window..."
          value={metadata.approach}
          onChange={e => updateMeta('approach', e.target.value)}
          className="w-full text-xs px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg resize-none outline-none focus:border-brand-400 dark:focus:border-brand-500 text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 transition-colors"
        />
      </div>

      {/* Tags Selector */}
      <div>
        <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">Tags & Patterns</label>
        <TagSelector
          selected={metadata.tags}
          onChange={v => updateMeta('tags', v)}
          onSelectFirstTag={(firstTag) => {
            if (!targetDirectory) setTargetDirectory(firstTag);
          }}
        />
      </div>

      {/* If problem file already exists in repo */}
      <div>
        <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
          If file already exists on GitHub
        </label>
        <div className="space-y-1.5">
          {VERSION_OPTIONS.map(opt => (
            <label key={opt.id} className="flex items-start gap-2.5 cursor-pointer group">
              <input
                type="radio"
                name="versionMode"
                value={opt.id}
                checked={versionMode === opt.id}
                onChange={() => setVersionMode(opt.id)}
                className="mt-0.5 accent-brand-500"
              />
              <div>
                <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{opt.label}</div>
                <div className="text-[10px] text-zinc-400 dark:text-zinc-500">{opt.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Error message */}
      {status === 'error' && (
        <div className="flex items-center gap-2 p-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-xs text-red-600 dark:text-red-400">{errorMsg}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={(e) => handleDismiss(solution, e)}
          className="flex items-center justify-center gap-1 py-2 px-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-xs font-medium rounded-xl transition-colors"
          title="Dismiss this problem without committing"
        >
          <X className="w-3.5 h-3.5" />
          Dismiss
        </button>

        <button
          type="button"
          onClick={handleCommit}
          disabled={status === 'loading'}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
        >
          {status === 'loading' ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Tapping into GitHub…
            </>
          ) : (
            <>
              <GitCommitHorizontal className="w-3.5 h-3.5" />
              Commit Solution
            </>
          )}
        </button>
      </div>
    </div>
  );
}
