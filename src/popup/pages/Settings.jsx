import React, { useState, useEffect } from 'react';
import { Save, Eye, EyeOff, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { getSettings, saveSettings } from '../../lib/storage.js';

export default function Settings() {
  const [form, setForm] = useState({
    githubToken: '',
    repoFullName: '',
    branch: 'main',
    baseDir: '',
    theme: 'dark',
  });
  const [showToken, setShowToken] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | saving | saved | error
  const [validating, setValidating] = useState(false);
  const [repoValid, setRepoValid] = useState(null); // null | true | false

  useEffect(() => {
    getSettings().then(s => {
      if (s && Object.keys(s).length > 0) setForm(f => ({ ...f, ...s }));
    });
  }, []);

  function update(key, val) {
    setForm(f => ({ ...f, [key]: val }));
    if (key === 'repoFullName' || key === 'githubToken') setRepoValid(null);
  }

  async function validateRepo() {
    if (!form.githubToken || !form.repoFullName) return;
    setValidating(true);
    try {
      const res = await fetch(`https://api.github.com/repos/${form.repoFullName}`, {
        headers: { Authorization: `Bearer ${form.githubToken}`, 'X-GitHub-Api-Version': '2022-11-28' },
      });
      setRepoValid(res.ok);
    } catch {
      setRepoValid(false);
    }
    setValidating(false);
  }

  async function handleSave() {
    setStatus('saving');
    try {
      await saveSettings(form);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('error');
    }
  }

  const inputClass = "w-full text-xs px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none focus:border-brand-400 dark:focus:border-brand-500 text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 transition-colors font-mono";
  const labelClass = "block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1";

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <div>
        <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">GitHub Configuration</h2>

        {/* PAT */}
        <div className="space-y-3">
          <div>
            <label className={labelClass}>GitHub Personal Access Token</label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                value={form.githubToken}
                onChange={e => update('githubToken', e.target.value)}
                className={inputClass + ' pr-9'}
              />
              <button
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <a
              href="https://github.com/settings/tokens/new?scopes=repo&description=RepoTap"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-1 text-[10px] text-brand-500 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
            >
              Generate token on GitHub <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>

          {/* Repo */}
          <div>
            <label className={labelClass}>Repository (owner/repo)</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="your-username/my-solutions"
                value={form.repoFullName}
                onChange={e => update('repoFullName', e.target.value)}
                className={inputClass + ' flex-1'}
              />
              <button
                onClick={validateRepo}
                disabled={validating || !form.githubToken || !form.repoFullName}
                className="px-2.5 py-1.5 text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:border-brand-400 dark:hover:border-brand-500 disabled:opacity-50 text-zinc-600 dark:text-zinc-400 transition-colors whitespace-nowrap"
              >
                {validating ? '…' : 'Test'}
              </button>
            </div>
            {repoValid === true && (
              <p className="flex items-center gap-1 text-[10px] text-green-500 mt-1"><CheckCircle2 className="w-3 h-3" /> Repository accessible</p>
            )}
            {repoValid === false && (
              <p className="flex items-center gap-1 text-[10px] text-red-500 mt-1"><AlertCircle className="w-3 h-3" /> Not found or no access</p>
            )}
          </div>

          {/* Branch */}
          <div>
            <label className={labelClass}>Branch</label>
            <input
              type="text"
              placeholder="main"
              value={form.branch}
              onChange={e => update('branch', e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Base directory */}
          <div>
            <label className={labelClass}>Base directory in repo (optional)</label>
            <input
              type="text"
              placeholder="leave empty to commit at repo root"
              value={form.baseDir}
              onChange={e => update('baseDir', e.target.value)}
              className={inputClass}
            />
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
              Solutions go to: <code className="font-mono">{form.baseDir.trim() ? `${form.baseDir.trim().replace(/^\/+|\/+$/g, '')}/` : ''}two-sum.py</code>
              {' '}(you can still change the directory per problem when committing)
            </p>
          </div>
        </div>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={status === 'saving'}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
      >
        {status === 'saving' ? (
          'Saving…'
        ) : status === 'saved' ? (
          <><CheckCircle2 className="w-4 h-4" /> Saved!</>
        ) : (
          <><Save className="w-4 h-4" /> Save Settings</>
        )}
      </button>

      {/* Info */}
      <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700">
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
          🔒 Your token is stored locally in <code className="font-mono text-[10px] bg-zinc-200 dark:bg-zinc-700 px-1 rounded">chrome.storage.local</code> and never sent to any server other than GitHub's API.
        </p>
      </div>
    </div>
  );
}
