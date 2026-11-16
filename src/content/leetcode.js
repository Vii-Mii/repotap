/**
 * RepoTap — LeetCode Content Script (Runs in ISOLATED world)
 * Watches for accepted submissions, extracts metadata, and forwards to service worker.
 */

(function () {
  'use strict';

  // Toast helpers — toast.js is loaded before this script and sets window.__REPOTAP_TOAST__
  function _showAutoCommitAnimation(data) {
    if (window.__REPOTAP_TOAST__) window.__REPOTAP_TOAST__.showAutoCommitAnimation(data);
  }
  function _showManualReviewPrompt(meta) {
    if (window.__REPOTAP_TOAST__) window.__REPOTAP_TOAST__.showManualReviewPrompt(meta);
  }

  console.log('[RepoTap LeetCode] Content script loaded on:', location.href);

  let lastUrl = location.href;
  let lastProcessedKey = null;
  let lastProcessedAt = 0;
  let isSubmitting = false;

  // ── Helpers ──────────────────────────────────────────────────────────────

  function getProblemMeta() {
    try {
      // 1. Slug from URL: /problems/two-sum/...
      const urlMatch = location.pathname.match(/\/problems\/([^/]+)/);
      const slug = urlMatch ? urlMatch[1] : 'unknown';

      // 2. Title from page or slug
      const titleEl =
        document.querySelector('[data-cy="question-title"]') ||
        document.querySelector('.text-title-large a') ||
        document.querySelector('div[class*="text-title-large"]') ||
        document.querySelector('div[class*="title"] a') ||
        document.querySelector('h4.question-title');

      let title = titleEl ? titleEl.textContent.trim() : '';
      if (!title || title.length < 2) {
        // Fallback: convert slug "two-sum" to "Two Sum"
        title = slug
          .split('-')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
      }

      // 3. Difficulty
      const diffEl =
        document.querySelector('[diff]') ||
        document.querySelector('.text-difficulty-easy, .text-difficulty-medium, .text-difficulty-hard') ||
        document.querySelector('[class*="text-difficulty"]') ||
        document.querySelector('[class*="difficulty"]');

      let difficulty = diffEl ? diffEl.textContent.trim() : 'Medium';
      if (!['Easy', 'Medium', 'Hard'].includes(difficulty)) {
        // Search text in problem panel
        const pageText = document.body.innerText;
        if (pageText.includes('Easy')) difficulty = 'Easy';
        else if (pageText.includes('Hard')) difficulty = 'Hard';
        else difficulty = 'Medium';
      }

      // 4. Language selector
      const langEl =
        document.querySelector('button[id*="headlessui-listbox-button"]') ||
        document.querySelector('.ant-select-selection-item') ||
        document.querySelector('[class*="language-select"] button') ||
        document.querySelector('button[class*="rounded"] span');

      const language = langEl ? langEl.textContent.trim() : 'Python 3';

      // 5. Topic Tags
      const topicTags = [];
      document.querySelectorAll('a[href*="/tag/"], div[class*="topic-tag"], a[class*="topic-tag"], [data-cy="topic-tag"]').forEach(el => {
        const txt = el.textContent.trim();
        if (txt && !topicTags.includes(txt)) topicTags.push(txt);
      });

      return {
        title,
        slug,
        difficulty,
        language,
        topicTags,
        platform: 'leetcode',
        url: location.origin + `/problems/${slug}/`,
      };
    } catch (e) {
      console.warn('[RepoTap LeetCode] Error getting meta:', e);
      return {
        title: 'LeetCode Problem',
        slug: 'unknown',
        difficulty: 'Medium',
        language: 'Python 3',
        platform: 'leetcode',
        url: location.href,
      };
    }
  }

  // Request code from MAIN world bridge (window.monaco)
  function requestBridgeCode() {
    return new Promise((resolve) => {
      const requestId = 'req_' + Date.now() + '_' + Math.random().toString(36).slice(2);

      const handler = (event) => {
        if (
          event.source === window &&
          event.data &&
          event.data.source === 'REPOTAP_PAGE_BRIDGE' &&
          event.data.type === 'CODE_RESPONSE' &&
          event.data.requestId === requestId
        ) {
          window.removeEventListener('message', handler);
          resolve(event.data.code);
        }
      };

      window.addEventListener('message', handler);
      window.postMessage({
        source: 'REPOTAP_CONTENT_SCRIPT',
        type: 'REQUEST_CODE',
        requestId,
      }, '*');

      // Timeout fallback after 400ms
      setTimeout(() => {
        window.removeEventListener('message', handler);
        resolve(null);
      }, 400);
    });
  }

  // DOM fallback code extraction
  function extractCodeFromDOM() {
    try {
      const lines = document.querySelectorAll('.view-lines .view-line');
      if (lines && lines.length > 0) {
        return Array.from(lines).map(l => l.textContent).join('\n');
      }
      const cmLines = document.querySelectorAll('.CodeMirror-line');
      if (cmLines && cmLines.length > 0) {
        return Array.from(cmLines).map(l => l.textContent).join('\n');
      }
      const codeTags = document.querySelectorAll('pre code, .ace_line');
      if (codeTags && codeTags.length > 0) {
        return Array.from(codeTags).map(l => l.textContent).join('\n');
      }
    } catch (_) {}
    return '';
  }

  function extractStatsFromDOM() {
    try {
      const statsEl = document.querySelector('[data-e2e-locator="submission-result-stats"]');
      if (statsEl) {
        const text = statsEl.textContent;
        const runtime = text.match(/(\d+\s*ms)/)?.[1] || null;
        const memory = text.match(/([\d.]+\s*MB)/)?.[1] || null;
        return { runtime, memory };
      }
      // Alternate modern layout stats
      const allText = document.body.innerText;
      const runtimeMatch = allText.match(/Runtime:\s*(\d+\s*ms)/i) || allText.match(/(\d+\s*ms)/);
      const memoryMatch = allText.match(/Memory:\s*([\d.]+\s*MB)/i) || allText.match(/([\d.]+\s*MB)/);
      return {
        runtime: runtimeMatch ? runtimeMatch[1] : null,
        memory: memoryMatch ? memoryMatch[1] : null,
      };
    } catch (_) {
      return { runtime: null, memory: null };
    }
  }

  // ── Dispatch Solution to Background ──────────────────────────────────────

  async function handleAccepted(bridgePayload = null) {
    const meta = getProblemMeta();

    // The same submission is reported by the network bridge and the DOM observer
    const now = Date.now();
    const dedupeKey = bridgePayload?.submissionId ? `${meta.slug}#${bridgePayload.submissionId}` : meta.slug;
    if (lastProcessedKey === dedupeKey && now - lastProcessedAt < 20000) return;
    lastProcessedKey = dedupeKey;
    lastProcessedAt = now;
    let code = bridgePayload?.code || '';
    if (!code) {
      code = (await requestBridgeCode()) || extractCodeFromDOM();
    }

    const stats = {
      runtime: bridgePayload?.runtime || extractStatsFromDOM().runtime,
      memory: bridgePayload?.memory || extractStatsFromDOM().memory,
    };

    console.log('[RepoTap LeetCode] 🎉 Solution Accepted detected!', { meta, stats, codeLength: code.length });

    const payload = {
      ...meta,
      language: bridgePayload?.lang || meta.language,
      code: code || '',
      stats,
      capturedAt: new Date().toISOString(),
    };

    chrome.runtime.sendMessage({
      type: 'SOLUTION_ACCEPTED',
      payload,
    }, (response) => {
      console.log('[RepoTap LeetCode] Sent to background, response:', response);
      if (response?.autoSaved) {
        if (response.data) _showAutoCommitAnimation(response.data);
      } else {
        _showManualReviewPrompt(meta);
      }
    });
  }

  // Listen for auto-commit confirmation animation from background
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'AUTOSAVE_COMMITTED') {
      _showAutoCommitAnimation(msg.data);
    }
  });

  // ── 1. Listen for Bridge Events (Network-intercepted) ────────────────────

  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data || event.data.source !== 'REPOTAP_PAGE_BRIDGE') return;

    if (event.data.type === 'LEETCODE_ACCEPTED') {
      console.log('[RepoTap LeetCode] Bridge reported ACCEPTED submission:', event.data.payload);
      handleAccepted(event.data.payload);
    }
  });

  // ── 2. Click Listeners on Submit Buttons ─────────────────────────────────

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const btnText = (btn.textContent || '').trim().toLowerCase();
    const isSubmit =
      btn.getAttribute('data-e2e-locator') === 'console-submit-button' ||
      btnText === 'submit' ||
      btn.classList.contains('submit') ||
      btn.getAttribute('data-cy') === 'submit-code-btn';

    // Running the sample tests must never be treated as a submission
    if (btn.getAttribute('data-e2e-locator') === 'console-run-button' || btnText === 'run') {
      isSubmitting = false;
      return;
    }

    if (isSubmit) {
      console.log('[RepoTap LeetCode] Submit button clicked. Watching for verdict...');
      snapshotExistingResults();
      submitClickedAt = Date.now();
      isSubmitting = true;
      // Keep isSubmitting active for up to 30 seconds
      setTimeout(() => { isSubmitting = false; }, 30000);
    }
  }, true);

  // ── 3. DOM MutationObserver (Continuous Fallback) ────────────────────────

  let checkDebounce = null;
  const observer = new MutationObserver(() => {
    if (checkDebounce) return;
    checkDebounce = setTimeout(() => {
      checkDebounce = null;
      checkDOMForAccepted();
    }, 500);
  });

  const RESULT_SELECTOR = [
    '[data-e2e-locator="submission-result"]',
    '[data-e2e-locator="submission-result-stats"]',
    'div[class*="status-accepted"]',
    '.text-green-s',
    '.text-green-60',
  ].join(',');

  // Result nodes already on the page when Submit was clicked (older verdicts) never count
  let staleResults = new WeakSet();
  let submitClickedAt = 0;

  function snapshotExistingResults() {
    staleResults = new WeakSet();
    document.querySelectorAll(RESULT_SELECTOR).forEach(el => staleResults.add(el));
  }

  function checkDOMForAccepted() {
    try {
      if (!isSubmitting || Date.now() - submitClickedAt < 1500) return;

      // Only a freshly rendered node whose own text says "Accepted" is a verdict for this submit
      const fresh = Array.from(document.querySelectorAll(RESULT_SELECTOR)).find(el =>
        !staleResults.has(el) && /^\s*Accepted\s*$/i.test(el.textContent || '')
      );
      if (!fresh) return;

      console.log('[RepoTap LeetCode] Accepted verdict appeared after Submit click.');
      isSubmitting = false;
      setTimeout(() => handleAccepted(null), 800);
    } catch (_) {}
  }

  observer.observe(document.body, { childList: true, subtree: true });

  // ── 4. URL Polling for SPA Route Changes ─────────────────────────────────

  setInterval(() => {
    const current = location.href;
    if (current !== lastUrl) {
      lastUrl = current;
      console.log('[RepoTap LeetCode] URL changed:', current);
      // Reset submission flag on navigate
      isSubmitting = false;
    }
  }, 1000);
})();
