import React, { useState, useEffect, useCallback } from 'react';
import { getActivity, computeStreak, computeBestStreak, markSheetSolved, unmarkSheetSolved } from '../../lib/storage.js';
import { computeAllSheetProgress, problemKey } from '../../lib/sheets.js';
import StreakCard from '../components/dashboard/StreakCard.jsx';
import SheetCard from '../components/dashboard/SheetCard.jsx';
import SheetDetail from '../components/dashboard/SheetDetail.jsx';

function sendMessage(message) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(message, (response) => resolve(response || {}));
    } catch (_) {
      resolve({});
    }
  });
}

export default function Dashboard() {
  const [sheetData, setSheetData] = useState([]);
  const [activity, setActivity] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedSheetId, setSelectedSheetId] = useState(null);

  const loadAll = useCallback(async () => {
    const [data, act] = await Promise.all([computeAllSheetProgress(), getActivity()]);
    setSheetData(data);
    setActivity(act);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Backfill sheet progress from past commits, then load
    sendMessage({ type: 'BACKFILL_SHEETS' }).then(() => loadAll());

    const handler = (changes, area) => {
      if (area === 'local' && (changes.rt_sheet_progress || changes.rt_activity || changes.rt_history)) {
        loadAll();
      }
    };
    chrome.storage.onChanged.addListener(handler);
    return () => chrome.storage.onChanged.removeListener(handler);
  }, [loadAll]);

  async function handleToggle(sheetId, problem, solved) {
    const key = problemKey(problem);
    if (solved) await unmarkSheetSolved(sheetId, key);
    else await markSheetSolved(sheetId, key, 'manual');
    loadAll();
  }

  if (loading) {
    return (
      <div className="p-4 space-y-3 animate-pulse">
        <div className="h-20 bg-zinc-100 dark:bg-zinc-800 rounded-xl" />
        {[1, 2, 3].map(i => <div key={i} className="h-14 bg-zinc-100 dark:bg-zinc-800 rounded-xl" />)}
      </div>
    );
  }

  const selected = selectedSheetId ? sheetData.find(s => s.sheet.id === selectedSheetId) : null;
  if (selected) {
    return (
      <SheetDetail
        sheet={selected.sheet}
        progress={selected.progress}
        onBack={() => setSelectedSheetId(null)}
        onToggle={(problem, solved) => handleToggle(selected.sheet.id, problem, solved)}
      />
    );
  }

  const streak = computeStreak(activity);
  const bestStreak = computeBestStreak(activity);

  return (
    <div className="p-4 space-y-3 animate-fade-in">
      <StreakCard streak={streak} bestStreak={bestStreak} activity={activity} />

      <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide pt-1">DSA Sheets</h2>

      <div className="space-y-2">
        {sheetData.map(({ sheet, progress }) => (
          <SheetCard key={sheet.id} sheet={sheet} progress={progress} onClick={() => setSelectedSheetId(sheet.id)} />
        ))}
      </div>
    </div>
  );
}