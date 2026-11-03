import React, { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import CommitReview from './pages/CommitReview.jsx';
import History from './pages/History.jsx';
import Settings from './pages/Settings.jsx';
import EmptyState from './components/EmptyState.jsx';
import CommitSuccess from './components/CommitSuccess.jsx';

export default function App() {
  const [theme, setTheme] = useState('dark');
  const [page, setPage] = useState('commit'); // 'commit' | 'history' | 'settings'
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commitResult, setCommitResult] = useState(null);

  // Load theme from storage
  useEffect(() => {
    chrome.storage.local.get('rt_settings', (result) => {
      const s = result.rt_settings || {};
      const saved = s.theme;
      if (saved) {
        setTheme(saved);
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(prefersDark ? 'dark' : 'light');
      }
    });
  }, []);

  // Apply dark class
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, [theme]);

  // Load pending solutions
  useEffect(() => {
    loadPending();

    const storageHandler = (changes, area) => {
      if (area === 'local' && changes.rt_pending) {
        setPending(changes.rt_pending.newValue || []);
      }
    };
    chrome.storage.onChanged.addListener(storageHandler);

    // Listen for updates from background
    const handler = (msg) => {
      if (msg.type === 'PENDING_UPDATED') loadPending();
    };
    chrome.runtime.onMessage.addListener(handler);

    return () => {
      chrome.storage.onChanged.removeListener(storageHandler);
      chrome.runtime.onMessage.removeListener(handler);
    };
  }, []);

  // Only the first load shows the skeleton; refreshes must not unmount the page
  async function loadPending() {
    chrome.storage.local.get('rt_pending', (result) => {
      setPending(result.rt_pending || []);
      setLoading(false);
    });
  }

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    chrome.storage.local.get('rt_settings', (r) => {
      const s = r.rt_settings || {};
      chrome.storage.local.set({ rt_settings: { ...s, theme: next } });
    });
  }

  return (
    <div className="w-[400px] min-h-[480px] max-h-[640px] flex flex-col bg-white dark:bg-zinc-900 overflow-hidden">
      <Header
        page={page}
        setPage={setPage}
        theme={theme}
        toggleTheme={toggleTheme}
        pendingCount={pending.length}
      />

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {page === 'commit' && (
          commitResult ? (
            <CommitSuccess result={commitResult} onDone={() => setCommitResult(null)} remaining={pending.length} />
          ) : loading ? (
            <LoadingSkeleton />
          ) : pending.length === 0 ? (
            <EmptyState setPage={setPage} />
          ) : (
            <CommitReview
              pending={pending}
              onCommitted={(info) => {
                loadPending();
                setCommitResult(info);
              }}
              onDismiss={loadPending}
            />
          )
        )}
        {page === 'history' && <History />}
        {page === 'settings' && <Settings />}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-4 space-y-3 animate-pulse">
      {[1, 2].map(i => (
        <div key={i} className="h-24 bg-zinc-100 dark:bg-zinc-800 rounded-xl" />
      ))}
    </div>
  );
}
