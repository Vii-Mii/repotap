/**
 * RepoTap — Chrome Storage Wrapper
 */

const KEYS = {
  SETTINGS: 'rt_settings',
  PENDING: 'rt_pending',
  HISTORY: 'rt_history',
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
