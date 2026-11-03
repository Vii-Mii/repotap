/**
 * RepoTap — Background Service Worker
 * Manages pending solutions, badge state, notifications, and GitHub API calls.
 */

import { commitToGitHub } from '../lib/github.js';
import {
  getPendingSolutions,
  addPendingSolution,
  removePendingSolution,
  removePendingById,
  getSettings,
  addToHistory,
  savePendingSolutions,
  migrateLegacyKeys,
} from '../lib/storage.js';

console.log('[RepoTap Background] Service worker initialized.');

migrateLegacyKeys().then(async () => updateBadge((await getPendingSolutions()).length));

// ── Message handling ──────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[RepoTap Background] Received message:', message.type);

  if (message.type === 'SOLUTION_ACCEPTED') {
    enqueue(() => handleSolutionAccepted(message.payload, sender)).then((res) => {
      sendResponse(res);
    });
    return true; // Keep message channel open for async response
  }

  if (message.type === 'COMMIT_SOLUTION') {
    enqueue(() => handleCommit(message.payload)).then(sendResponse);
    return true;
  }

  if (message.type === 'GET_PENDING') {
    getPendingSolutions().then((pending) => {
      sendResponse(pending);
    });
    return true;
  }

  if (message.type === 'REMOVE_PENDING') {
    enqueue(() => handleRemovePending(message.payload)).then((res) => {
      sendResponse(res);
    });
    return true;
  }

  if (message.type === 'OPEN_POPUP') {
    openRepoTap(sender?.tab?.windowId);
    sendResponse({ ok: true });
    return false;
  }
});

// Storage read-modify-write must not interleave when duplicate reports arrive together
let queue = Promise.resolve();
function enqueue(task) {
  const run = queue.then(task, task);
  queue = run.catch(() => {});
  return run;
}

// The popup may be closed, in which case there is no receiver
function notifyPopup() {
  try {
    chrome.runtime.sendMessage({ type: 'PENDING_UPDATED' }).catch(() => {});
  } catch (_) {}
}

// ── Remove Pending Solution ───────────────────────────────────────────────

async function handleRemovePending(payload) {
  if (payload.id) {
    await removePendingById(payload.id);
  } else if (payload.slug && payload.platform) {
    await removePendingSolution(payload.slug, payload.platform);
  }
  const remaining = await getPendingSolutions();
  updateBadge(remaining.length);

  notifyPopup();

  return { success: true, count: remaining.length };
}

// ── Solution Accepted Handler ─────────────────────────────────────────────

async function handleSolutionAccepted(payload, sender) {
  try {
    console.log('[RepoTap Background] Processing accepted solution:', payload.title, payload.platform);
    const existing = await getPendingSolutions();

    // Check if same problem already pending
    const existingIndex = existing.findIndex(
      s => s.platform === payload.platform && s.slug === payload.slug
    );

    let updatedList;
    if (existingIndex >= 0) {
      // Problem already pending -> update it with newest code & stats
      console.log('[RepoTap Background] Updating existing pending solution:', payload.slug);
      existing[existingIndex] = {
        ...existing[existingIndex],
        ...payload,
        updatedAt: new Date().toISOString(),
      };
      updatedList = existing;
      await savePendingSolutions(updatedList);
    } else {
      // New pending problem
      console.log('[RepoTap Background] Adding new pending solution:', payload.slug);
      const newEntry = {
        ...payload,
        id: `${payload.platform}-${payload.slug}-${Date.now()}`,
      };
      updatedList = [...existing, newEntry];
      await savePendingSolutions(updatedList);
    }

    // Update extension icon badge
    updateBadge(updatedList.length);

    // Open RepoTap automatically so the user doesn't have to click the icon
    openRepoTap(sender?.tab?.windowId);

    // Desktop system notification
    try {
      chrome.notifications.create(`repotap_notif_${payload.platform}_${payload.slug}`, {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'RepoTap: Solution Solved! 🎉',
        message: `${payload.title} (${payload.platform}) is ready to commit. Tap to review.`,
        priority: 2,
      });
    } catch (notifErr) {
      console.warn('[RepoTap Background] Notification error:', notifErr);
    }

    // Notify open popup
    notifyPopup();

    return { success: true, count: updatedList.length };
  } catch (err) {
    console.error('[RepoTap Background] Error handling solution accepted:', err);
    return { success: false, error: err.message };
  }
}

// ── Auto-open ─────────────────────────────────────────────────────────────

let openInFlight = null;

/**
 * Opens the toolbar popup. Concurrent/duplicate requests (e.g. LeetCode reports
 * one submission through several channels) collapse into a single open, and an
 * already-open popup is left alone. Only when Chrome refuses to open the popup
 * do we fall back to a standalone RepoTap window.
 */
function openRepoTap(windowId) {
  if (!openInFlight) {
    openInFlight = doOpenRepoTap(windowId).finally(() => {
      setTimeout(() => { openInFlight = null; }, 4000);
    });
  }
  return openInFlight;
}

async function isRepoTapOpen() {
  try {
    const popupUrl = chrome.runtime.getURL('popup.html');
    if (chrome.runtime.getContexts) {
      const ctxs = await chrome.runtime.getContexts({ contextTypes: ['POPUP', 'TAB'] });
      if (ctxs.some(c => c.documentUrl === popupUrl)) return true;
    }
    const wins = await chrome.windows.getAll({ populate: true });
    return wins.some(w => w.tabs?.some(t => t.url === popupUrl));
  } catch (_) {
    return false;
  }
}

async function doOpenRepoTap(windowId) {
  if (await isRepoTapOpen()) return;

  try {
    await chrome.action.openPopup(windowId ? { windowId } : undefined);
    return;
  } catch (err) {
    console.warn('[RepoTap Background] openPopup failed, using window fallback:', err?.message);
  }

  // The popup may have opened despite the rejection
  if (await isRepoTapOpen()) return;

  try {
    await chrome.windows.create({
      url: chrome.runtime.getURL('popup.html'),
      type: 'popup',
      width: 440,
      height: 700,
      focused: true,
    });
  } catch (err) {
    console.warn('[RepoTap Background] Could not open RepoTap window:', err);
  }
}

chrome.notifications.onClicked.addListener((id) => {
  if (id.startsWith('repotap_notif_')) {
    chrome.notifications.clear(id);
    openRepoTap();
  }
});

// ── Commit Handler ────────────────────────────────────────────────────────

async function handleCommit(commitData) {
  try {
    const settings = await getSettings();

    if (!settings.githubToken || !settings.repoFullName) {
      return { success: false, error: 'GitHub token or repo not configured. Open Settings in RepoTap.' };
    }

    const result = await commitToGitHub({ ...commitData, settings });

    if (result.success) {
      if (commitData.solution.id) {
        await removePendingById(commitData.solution.id);
      } else {
        await removePendingSolution(commitData.solution.slug, commitData.solution.platform);
      }

      await addToHistory({
        ...commitData.solution,
        commitUrl: result.commitUrl,
        filePath: result.filePath,
        committedAt: new Date().toISOString(),
      });

      const remaining = await getPendingSolutions();
      updateBadge(remaining.length);

      try {
        chrome.notifications.create(`repotap_commit_${Date.now()}`, {
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: 'RepoTap: Committed ✅',
          message: `${commitData.solution.title} → ${result.filePath}`,
        });
      } catch (_) {}

      // Notify popup
      notifyPopup();
    }

    return result;
  } catch (err) {
    console.error('[RepoTap Background] Commit error:', err);
    return { success: false, error: err.message };
  }
}

// ── Badge Helpers ─────────────────────────────────────────────────────────

function updateBadge(count) {
  if (count > 0) {
    chrome.action.setBadgeText({ text: String(count) });
    chrome.action.setBadgeBackgroundColor({ color: '#0ea5e9' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

// Single source of truth for the badge: any change to the pending list
// (new solution, dismiss, commit) updates the count.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.rt_pending) {
    updateBadge((changes.rt_pending.newValue || []).length);
  }
});

// Restore badge on startup / install
chrome.runtime.onStartup.addListener(async () => {
  const pending = await getPendingSolutions();
  updateBadge(pending.length);
});

chrome.runtime.onInstalled.addListener(async () => {
  const pending = await getPendingSolutions();
  updateBadge(pending.length);
});
