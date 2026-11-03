/**
 * RepoTap — HackerRank Content Script (Runs in ISOLATED world)
 * Watches for accepted submissions, extracts metadata, and forwards to service worker.
 */

(function () {
  'use strict';

  console.log('[RepoTap HackerRank] Content script loaded on:', location.href);

  let lastUrl = location.href;
  let lastProcessedKey = null;
  let isSubmitting = false;

  function getProblemMeta() {
    try {
      const titleEl =
        document.querySelector('.challenge-page-label') ||
        document.querySelector('h1.ui-icon-label') ||
        document.querySelector('.challenge-name') ||
        document.querySelector('h3.challenge-name') ||
        document.querySelector('h1');

      const title = titleEl ? titleEl.textContent.trim() : document.title.replace(' | HackerRank', '');
      const pathParts = location.pathname.split('/').filter(Boolean);
      // /challenges/<slug>/problem — the slug is the segment after "challenges", not the last one
      const chIdx = pathParts.indexOf('challenges');
      const slug = (chIdx >= 0 && pathParts[chIdx + 1]) || pathParts[pathParts.length - 1] || 'unknown';
      const domain = pathParts.includes('challenges') ? pathParts[pathParts.indexOf('challenges') - 1] : 'general';

      const langEl =
        document.querySelector('.language-dropdown .select2-selection__rendered') ||
        document.querySelector('[class*="language-picker"] span') ||
        document.querySelector('select[name="language"] option:checked');
      const language = langEl ? langEl.textContent.trim() : 'Java';

      return {
        title,
        slug,
        domain,
        language,
        platform: 'hackerrank',
        url: location.href,
      };
    } catch (e) {
      return {
        title: 'HackerRank Challenge',
        slug: 'unknown',
        domain: 'general',
        language: 'Java',
        platform: 'hackerrank',
        url: location.href,
      };
    }
  }

  function requestBridgeCode() {
    return new Promise((resolve) => {
      const requestId = 'hr_req_' + Date.now();

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

      setTimeout(() => {
        window.removeEventListener('message', handler);
        resolve(null);
      }, 400);
    });
  }

  function extractCodeFromDOM() {
    try {
      const lines = document.querySelectorAll('.ace_line, .view-line');
      if (lines && lines.length > 0) {
        return Array.from(lines).map(l => l.textContent).join('\n');
      }
    } catch (_) {}
    return '';
  }

  async function handleAccepted() {
    const meta = getProblemMeta();
    let code = (await requestBridgeCode()) || extractCodeFromDOM();

    const key = `${meta.slug}-${Date.now().toString().slice(0, -3)}`;
    if (lastProcessedKey === key) return;
    lastProcessedKey = key;

    console.log('[RepoTap HackerRank] 🎉 Solution Accepted!', { meta, codeLength: code.length });

    const payload = {
      ...meta,
      code: code || '',
      stats: { runtime: null, memory: null },
      capturedAt: new Date().toISOString(),
    };

    chrome.runtime.sendMessage({
      type: 'SOLUTION_ACCEPTED',
      payload,
    });
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const text = (btn.textContent || '').trim().toLowerCase();
    if (text.includes('submit code') || text === 'submit') {
      console.log('[RepoTap HackerRank] Submit button clicked.');
      isSubmitting = true;
      setTimeout(() => { isSubmitting = false; }, 30000);
    }
  }, true);

  let debounce = null;
  const observer = new MutationObserver(() => {
    if (debounce) return;
    debounce = setTimeout(() => {
      debounce = null;
      const text = document.body.innerText || '';
      const isSuccess =
        text.includes('Congratulations') ||
        text.includes('You have passed all the test cases') ||
        document.querySelector('.result-box-status.accepted') ||
        document.querySelector('.result-accepted');

      if (isSuccess && isSubmitting) {
        isSubmitting = false;
        setTimeout(handleAccepted, 800);
      }
    }, 600);
  });

  observer.observe(document.body, { childList: true, subtree: true });

  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      isSubmitting = false;
    }
  }, 1000);
})();
