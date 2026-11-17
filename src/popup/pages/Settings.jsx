import React, { useState, useEffect } from 'react';
import { Save, CheckCircle2, AlertCircle, Zap, Sparkles, Github, LogOut, Loader2, ShieldAlert } from 'lucide-react';
import { getSettings, saveSettings } from '../../lib/storage.js';

const AUTH_FIELDS = ['githubToken', 'githubLogin', 'githubAvatarUrl', 'authMethod', 'authedAt', 'tokenExpiresAt'];

function sendMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => resolve(response || {}));
  });
}

export default function Settings() {
  const [form, setForm] = useState({
    repoFullName: '',
    branch: 'main',
    baseDir: '',
    theme: 'dark',
    autoSuggestEnabled: true,
    autoSave: false,
    autoSaveDirMode: 'topic',
    autoSaveVersionMode: 'new_version',
  });
  const [status, setStatus] = useState('idle'); // idle | saving | saved | error
  const [validating, setValidating] = useState(false);
  const [repoValid, setRepoValid] = useState(null); // null | true | false

  const [auth, setAuth] = useState(null); // { configured, authed, login, avatarUrl, authMethod }
  const [authBusy, setAuthBusy] = useState(false); // idle | logging-in | error
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    getSettings().then(s => {
      if (s && Object.keys(s).length > 0) {
        setForm(f => ({
          ...f,
          ...s,
          autoSuggestEnabled: s.autoSuggestEnabled !== false,
        }));
      }
    });
    sendMessage({ type: 'GET_AUTH_STATE' }).then(res => setAuth(res));
  }, []);

  function update(key, val) {
    setForm(f => ({ ...f, [key]: val }));
    if (key === 'repoFullName') setRepoValid(null);
  }

  async function handleLogin() {
    setAuthBusy('logging-in');
    setAuthError(null);
    const res = await sendMessage({ type: 'LOGIN_GITHUB' });
    if (res.ok) {
      setAuth(prev => ({ ...(prev || {}), authed: true, login: res.login, avatarUrl: res.avatarUrl, authMethod: 'oauth' }));
      // Refresh the token in the form so repo testing works right away
      const settings = await getSettings();
      setForm(f => ({ ...f, githubToken: settings.githubToken || '' }));
    } else {
      setAuthError(res.error || 'Login failed');
    }
    setAuthBusy('idle');
  }

  async function handleLogout() {
    setAuthBusy('logging-in');
    await sendMessage({ type: 'LOGOUT_GITHUB' });
    setAuth(prev => ({ ...(prev || {}), authed: false, login: null, avatarUrl: null }));
    setRepoValid(null);
    setAuthBusy('idle');
  }

  async function validateRepo() {
    const token = form.githubToken;
    if (!token || !form.repoFullName) return;
    setValidating(true);
    try {
      const res = await fetch(`https://api.github.com/repos/${form.repoFullName}`, {
        headers: { Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' },
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
      // Merge over stored settings so auth fields (owned by login/logout) survive
      const current = await getSettings();
      const toSave = { ...current, ...form };
      for (const key of AUTH_FIELDS) delete toSave[key];
      const merged = { ...current, ...toSave };
      await saveSettings(merged);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('error');
    }
  }

  const inputClass = "w-full text-xs px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none focus:border-brand-400 dark:focus:border-brand-500 text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 transition-colors font-mono";
  const labelClass = "block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1";
  const authed = Boolean(auth?.authed);

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <div>
        <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">GitHub Account</h2>

        {/* Login card */}
        <div className="bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700/80">
          {auth === null ? (
            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <Loader2 className="w-4 h-4 animate-spin" /> Checking GitHub session…
            </div>
          ) : !auth.configured ? (
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">GitHub login is not configured yet</p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed mt-1">
                  Register a GitHub OAuth App with callback URL <code className="font-mono text-[10px] bg-zinc-200 dark:bg-zinc-700 px-1 rounded">https://&lt;extension-id&gt;.chromiumapp.org/</code> and paste its Client ID into <code className="font-mono text-[10px] bg-zinc-200 dark:bg-zinc-700 px-1 rounded">src/lib/auth/config.js</code>, then rebuild the extension.
                </p>
              </div>
            </div>
          ) : authed ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                {auth.avatarUrl ? (
                  <img src={auth.avatarUrl} alt="" className="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-700" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                    <Github className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">@{auth.login}</p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    {auth.authMethod === 'oauth' ? 'Connected via GitHub login' : 'Connected via token (legacy)'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                disabled={authBusy === 'logging-in'}
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-zinc-500 hover:text-red-500 dark:text-zinc-400 dark:hover:text-red-400 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:border-red-300 dark:hover:border-red-700 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {authBusy === 'logging-in' ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />}
                Disconnect
              </button>
            </div>
          ) : (
            <div>
              <button
                onClick={handleLogin}
                disabled={authBusy === 'logging-in'}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-semibold rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-100 disabled:opacity-60 transition-colors"
              >
                {authBusy === 'logging-in' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Opening GitHub…</>
                ) : (
                  <><Github className="w-4 h-4" /> Sign in with GitHub</>
                )}
              </button>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-2 leading-relaxed">
                RepoTap gets a token automatically after you authorize — no manual token copying. Your token stays in local storage and is only sent to GitHub.
              </p>
              {authError && (
                <p className="flex items-start gap-1 text-[10px] text-red-500 mt-2">
                  <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" /> {authError}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Repo config */}
        <div className="mt-3 space-y-3">
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
                title={!authed ? 'Sign in first to test repository access' : 'Check repository access'}
                className="px-2.5 py-1.5 text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:border-brand-400 dark:hover:border-brand-500 disabled:opacity-50 text-zinc-600 dark:text-zinc-400 transition-colors whitespace-nowrap"
              >
                {validating ? '…' : 'Test'}
              </button>
            </div>
            {!authed && (
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">Sign in with GitHub to test repository access.</p>
            )}
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

      {/* Auto-Save & Suggestions */}
      <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
        <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-brand-500" />
          Auto-Save & Suggestions
        </h2>

        {/* Auto-Suggestion Toggle (Enabled by Default) */}
        <div className="bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700/80 mb-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="pr-2">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                Intelligent Auto-Suggestion
              </span>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight mt-0.5">
                Automatically detects problem topic directory (e.g. <code className="font-mono text-[10px] text-brand-500">two-pointers</code>, <code className="font-mono text-[10px] text-brand-500">dynamic-programming</code>), time/space complexity, approach, and tags. Enabled by default.
              </p>
            </div>
            <button
              type="button"
              onClick={() => update('autoSuggestEnabled', form.autoSuggestEnabled === false ? true : false)}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                form.autoSuggestEnabled !== false ? 'bg-brand-500' : 'bg-zinc-300 dark:bg-zinc-600'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  form.autoSuggestEnabled !== false ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Auto-Save Toggle */}
        <div className="bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700/80 mb-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                Auto-Save to GitHub
              </span>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight mt-0.5">
                Automatically commits solutions as soon as they pass on LeetCode, GFG, or HackerRank.
              </p>
            </div>
            <button
              type="button"
              onClick={() => update('autoSave', !form.autoSave)}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                form.autoSave ? 'bg-brand-500' : 'bg-zinc-300 dark:bg-zinc-600'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  form.autoSave ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {form.autoSave && (
            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700 space-y-2.5 animate-fade-in">
              {/* Directory Strategy */}
              <div>
                <label className={labelClass}>Auto-Save Folder Organization</label>
                <select
                  value={form.autoSaveDirMode || 'topic'}
                  onChange={e => update('autoSaveDirMode', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none text-zinc-800 dark:text-zinc-200"
                >
                  <option value="topic">Topic-based (e.g. two-pointers/two-sum.py)</option>
                  <option value="baseDir">Base directory only (e.g. leetcode/two-sum.py or root)</option>
                  <option value="combined">Combined: Base + Topic (e.g. leetcode/two-pointers/two-sum.py)</option>
                </select>
              </div>

              {/* Version Mode */}
              <div>
                <label className={labelClass}>When problem already exists on GitHub</label>
                <select
                  value={form.autoSaveVersionMode || 'new_version'}
                  onChange={e => update('autoSaveVersionMode', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none text-zinc-800 dark:text-zinc-200"
                >
                  <option value="new_version">Append New Version (separated by line)</option>
                  <option value="override">Override entire file with new solution</option>
                </select>
              </div>
            </div>
          )}
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
          🔒 Your GitHub token is stored locally in <code className="font-mono text-[10px] bg-zinc-200 dark:bg-zinc-700 px-1 rounded">chrome.storage.local</code> and never sent to any server other than GitHub's API.
        </p>
      </div>
    </div>
  );
}