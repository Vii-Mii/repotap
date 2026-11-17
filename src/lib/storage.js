/**
 * RepoTap — Chrome Storage Wrapper
 */

const KEYS = {
  SETTINGS: 'rt_settings',
  PENDING: 'rt_pending',
  HISTORY: 'rt_history',
  ACTIVITY: 'rt_activity',
  SHEET_PROGRESS: 'rt_sheet_progress',
};

// Carry data over from the pre-rename (CodeVault) storage keys.
export async function migrateLegacyKeys() {
  const legacy = { cv_settings: KEYS.SETTINGS, cv_pending: KEYS.PENDING, cv_history: KEYS.HISTORY };
  return new Promise((resolve) => {
    chrome.storage.local.get([...Object.keys(legacy), ...Object.values(legacy)], (res) => {
      const toSet = {};
      for (const [oldKey, newKey] of Object.entries(legacy)) {
        if (res[oldKey] !== undefined && res[newKey] === undefined) toSet[newKey] = res[oldKey];
      }
      chrome.storage.local.set(toSet, () => {
        chrome.storage.local.remove(Object.keys(legacy), resolve);
      });
    });
  });
}

// ── Settings ──────────────────────────────────────────────────────────────

export async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(KEYS.SETTINGS, (result) => {
      resolve(result[KEYS.SETTINGS] || {});
    });
  });
}

export async function saveSettings(settings) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [KEYS.SETTINGS]: settings }, resolve);
  });
}

// ── Pending Solutions ─────────────────────────────────────────────────────

export async function getPendingSolutions() {
  return new Promise((resolve) => {
    chrome.storage.local.get(KEYS.PENDING, (result) => {
      resolve(result[KEYS.PENDING] || []);
    });
  });
}

export async function savePendingSolutions(list) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [KEYS.PENDING]: list }, resolve);
  });
}

export async function addPendingSolution(solution) {
  const current = await getPendingSolutions();
  const existingIdx = current.findIndex(
    s => s.platform === solution.platform && s.slug === solution.slug
  );

  let updated;
  if (existingIdx >= 0) {
    current[existingIdx] = { ...current[existingIdx], ...solution, updatedAt: new Date().toISOString() };
    updated = current;
  } else {
    updated = [...current, { ...solution, id: `${solution.platform}-${solution.slug}-${Date.now()}` }];
  }

  return savePendingSolutions(updated);
}

export async function removePendingSolution(slug, platform) {
  const current = await getPendingSolutions();
  const updated = current.filter(s => !(s.slug === slug && s.platform === platform));
  return savePendingSolutions(updated);
}

export async function removePendingById(id) {
  const current = await getPendingSolutions();
  const updated = current.filter(s => s.id !== id);
  return savePendingSolutions(updated);
}

export async function updatePendingSolution(id, changes) {
  const current = await getPendingSolutions();
  const updated = current.map(s => s.id === id ? { ...s, ...changes } : s);
  return savePendingSolutions(updated);
}

// ── History ───────────────────────────────────────────────────────────────

export async function getHistory() {
  return new Promise((resolve) => {
    chrome.storage.local.get(KEYS.HISTORY, (result) => {
      resolve(result[KEYS.HISTORY] || []);
    });
  });
}

export async function addToHistory(entry) {
  const current = await getHistory();
  const updated = [entry, ...current].slice(0, 200);
  return new Promise((resolve) => {
    chrome.storage.local.set({ [KEYS.HISTORY]: updated }, resolve);
  });
}

export async function clearHistory() {
  return new Promise((resolve) => {
    chrome.storage.local.remove(KEYS.HISTORY, resolve);
  });
}

// ── Daily Activity & Streak ───────────────────────────────────────────────

// Local-timezone YYYY-MM-DD (matches how the user experiences "today")
export function localDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function getActivity() {
  return new Promise((resolve) => {
    chrome.storage.local.get(KEYS.ACTIVITY, (result) => {
      resolve(result[KEYS.ACTIVITY] || {});
    });
  });
}

// kind: 'accepted' | 'commit'
export async function recordActivity(kind) {
  const activity = await getActivity();
  const today = localDateKey();
  const entry = activity[today] || { accepted: 0, commits: 0 };
  if (kind === 'commit') entry.commits = (entry.commits || 0) + 1;
  else entry.accepted = (entry.accepted || 0) + 1;
  activity[today] = entry;
  return new Promise((resolve) => {
    chrome.storage.local.set({ [KEYS.ACTIVITY]: activity }, resolve);
  });
}

function dayHasActivity(entry) {
  return Boolean(entry && ((entry.accepted || 0) + (entry.commits || 0) > 0));
}

// Consecutive days with activity, ending today or yesterday (a streak is only
// broken once a full day passes with no activity).
export function computeStreak(activity = {}) {
  let streak = 0;
  const cursor = new Date();
  if (!dayHasActivity(activity[localDateKey(cursor)])) {
    cursor.setDate(cursor.getDate() - 1); // allow the streak to survive until day's end
    if (!dayHasActivity(activity[localDateKey(cursor)])) return 0;
  }
  while (dayHasActivity(activity[localDateKey(cursor)])) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function computeBestStreak(activity = {}) {
  const keys = Object.keys(activity).filter(k => dayHasActivity(activity[k])).sort();
  let best = 0;
  let run = 0;
  let prev = null;
  for (const key of keys) {
    if (prev) {
      const prevDate = new Date(`${prev}T12:00:00`);
      prevDate.setDate(prevDate.getDate() + 1);
      const consecutive = localDateKey(prevDate) === key;
      run = consecutive ? run + 1 : 1;
    } else {
      run = 1;
    }
    if (run > best) best = run;
    prev = key;
  }
  return best;
}

// ── DSA Sheet Progress ────────────────────────────────────────────────────

// rt_sheet_progress = { [sheetId]: { [titleSlug]: { solvedAt, source } } }

export async function getSheetProgress() {
  return new Promise((resolve) => {
    chrome.storage.local.get(KEYS.SHEET_PROGRESS, (result) => {
      resolve(result[KEYS.SHEET_PROGRESS] || {});
    });
  });
}

export async function saveSheetProgress(progress) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [KEYS.SHEET_PROGRESS]: progress }, resolve);
  });
}

// source: 'auto' (accepted submission) | 'manual' (user checkbox) | 'backfill' (history scan)
export async function markSheetSolved(sheetId, slug, source = 'auto') {
  const progress = await getSheetProgress();
  const sheet = progress[sheetId] || {};
  if (sheet[slug]) return progress; // already solved — keep the original date
  sheet[slug] = { solvedAt: localDateKey(), source };
  progress[sheetId] = sheet;
  await saveSheetProgress(progress);
  return progress;
}

export async function unmarkSheetSolved(sheetId, slug) {
  const progress = await getSheetProgress();
  if (progress[sheetId]) delete progress[sheetId][slug];
  await saveSheetProgress(progress);
  return progress;
}
