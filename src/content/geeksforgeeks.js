/**
 * RepoTap — GeeksForGeeks Content Script
 * Supports top frame & iframe playgrounds.
 * Continuous observer for "Problem Solved Successfully", "Correct Answer", etc.
 */

(function () {
  'use strict';

  console.log('[RepoTap GFG] Content script initialized on:', location.href);

  let lastProcessedKey = null;
  let lastProcessedAt = 0;
  let solvedVisible = false;

  // ── Problem Metadata ──────────────────────────────────────────────────────

  function getEffectiveUrl() {
    try {
      if (window.top && window.top.location && window.top.location.href) {
        return window.top.location.href;
      }
    } catch (_) {}
    return location.href;
  }

  function getTopDoc() {
    try {
      return window.top?.document || document;
    } catch (_) {
      return document;
    }
  }

  function toTitleCase(slug) {
    return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  function detectLanguage(domGuess, code) {
    const known = /(c\+\+|python|java(?!script)|javascript|c#|golang|\bgo\b|php|\bc\b|kotlin|swift|ruby|scala|rust|typescript)/i;
    if (domGuess && known.test(domGuess)) return domGuess.trim();

    const c = code || '';
    if (/#include\s*<|vector<|\bstd::|using namespace/.test(c)) return 'C++';
    if (/^\s*(def |class \w+:|import \w+)/m.test(c) && !/[;{]\s*$/m.test(c)) return 'Python3';
    if (/public\s+(static\s+)?\w|class Solution\s*\{[\s\S]*(int|String|List)\b/.test(c)) return 'Java';
    if (/\b(function|const|let)\b|=>/.test(c)) return 'JavaScript';
    return domGuess || 'C++';
  }

  function getProblemMeta(code = '') {
    try {
      const pageUrl = getEffectiveUrl();
      // Match /problems/two-sum/1 or /problems/two-sum
      const match = pageUrl.match(/\/problems\/([^/?#]+)/) || (document.referrer || '').match(/\/problems\/([^/?#]+)/);
      const slug = match ? match[1] : (location.pathname.split('/').filter(Boolean).pop() || 'gfg-problem');
      const topDoc = getTopDoc();

      // Title (GFG class names carry a hash suffix, so match by prefix)
      let title = '';
      try {
        const titleEl =
          topDoc.querySelector('[class*="problems_header_content__title"]') ||
          topDoc.querySelector('[class*="ProblemTitle"]') ||
          topDoc.querySelector('[class*="problem-title"]') ||
          topDoc.querySelector('h3.title') ||
          topDoc.querySelector('h1') ||
          topDoc.querySelector('h2');
        title = titleEl ? titleEl.textContent.trim() : '';
      } catch (_) {}

      if (!title) {
        const docTitle = (topDoc.title || '').split(/\s[|\-–]\s/)[0].trim();
        if (docTitle && !/geeksforgeeks/i.test(docTitle)) title = docTitle;
      }
      if (!title || title.length < 2) title = toTitleCase(slug);

      // Difficulty
      let difficulty = 'Medium';
      try {
        const bodyText = topDoc.body ? topDoc.body.innerText : '';
        const m = bodyText.match(/Difficulty\s*:?\s*(School|Basic|Easy|Medium|Hard)/i);
        if (m) {
          difficulty = m[1];
        } else {
          const diffEl = topDoc.querySelector('[class*="difficulty"], [class*="Difficulty"]');
          const t = diffEl ? diffEl.textContent.match(/School|Basic|Easy|Medium|Hard/i) : null;
          if (t) difficulty = t[0];
        }
        difficulty = difficulty.charAt(0).toUpperCase() + difficulty.slice(1).toLowerCase();
        if (difficulty === 'School' || difficulty === 'Basic') difficulty = 'Easy';
      } catch (_) {}

      // Language
      let langGuess = '';
      try {
        const langEl =
          topDoc.querySelector('[class*="lang-select"] button') ||
          topDoc.querySelector('[class*="language"] button') ||
          topDoc.querySelector('.language-dropdown') ||
          topDoc.querySelector('select[class*="language"]');
        if (langEl) langGuess = langEl.tagName === 'SELECT' ? langEl.selectedOptions[0]?.textContent || '' : langEl.textContent;
      } catch (_) {}

      return {
        title,
        slug,
        difficulty,
        language: detectLanguage(langGuess, code),
        platform: 'geeksforgeeks',
        url: pageUrl,
      };
    } catch (e) {
      console.warn('[RepoTap GFG] Meta extraction error:', e);
      return {
        title: 'GeeksForGeeks Problem',
        slug: 'gfg-problem',
        difficulty: 'Medium',
        language: detectLanguage('', code),
        platform: 'geeksforgeeks',
        url: location.href,
      };
    }
  }

  function requestBridgeCode() {
    return new Promise((resolve) => {
      const requestId = 'gfg_req_' + Date.now() + '_' + Math.random().toString(36).slice(2);

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
      window.postMessage({ source: 'REPOTAP_CONTENT_SCRIPT', type: 'REQUEST_CODE', requestId }, '*');

      setTimeout(() => {
        window.removeEventListener('message', handler);
        resolve(null);
      }, 500);
    });
  }

  // ── Code Extraction ───────────────────────────────────────────────────────

  function extractCode() {
    // 1. Ace Editor DOM lines (GFG primary editor)
    try {
      const aceLines = document.querySelectorAll('.ace_editor .ace_line');
      if (aceLines && aceLines.length > 0) {
        const code = Array.from(aceLines).map(l => l.textContent).join('\n');
        if (code.trim().length > 0) return code;
      }
    } catch (_) {}

    // 2. Monaco lines
    try {
      const monacoLines = document.querySelectorAll('.view-lines .view-line');
      if (monacoLines && monacoLines.length > 0) {
        const code = Array.from(monacoLines).map(l => l.textContent).join('\n');
        if (code.trim().length > 0) return code;
      }
    } catch (_) {}

    // 3. CodeMirror or Textarea
    try {
      const ta = document.querySelector('textarea.ace_text-input, textarea');
      if (ta && ta.value && ta.value.trim().length > 10) return ta.value;
    } catch (_) {}

    return '';
  }

  // ── Floating On-Screen Toast Banner ──────────────────────────────────────

  function showFloatingBanner(meta) {
    try {
      const targetDoc = getTopDoc();
      if (targetDoc.getElementById('repotap-floating-toast')) return;

      const toast = targetDoc.createElement('div');
      toast.id = 'repotap-floating-toast';
      toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 2147483647;
        background: #09090b;
        color: #fafafa;
        border: 1px solid #27272a;
        border-radius: 12px;
        padding: 12px 16px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 280px;
      `;

      toast.innerHTML = `
        <div style="width: 32px; height: 32px; border-radius: 8px; background: #0ea5e9; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0;">
          ⚡
        </div>
        <div style="flex: 1; min-width: 0;">
          <div style="font-size: 10px; font-weight: 700; color: #0ea5e9; text-transform: uppercase;">RepoTap</div>
          <div style="font-size: 12px; font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" id="repotap-toast-title"></div>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <button id="repotap-open-btn" style="background: #0ea5e9; color: white; border: none; padding: 5px 12px; border-radius: 7px; font-size: 11px; font-weight: 600; cursor: pointer;">
            Commit
          </button>
          <button id="repotap-close-btn" style="background: transparent; color: #71717a; border: none; padding: 4px 6px; font-size: 13px; cursor: pointer;">
            ✕
          </button>
        </div>
      `;

      toast.querySelector('#repotap-toast-title').textContent = meta.title || 'Solution Solved';
      targetDoc.body.appendChild(toast);

      toast.querySelector('#repotap-open-btn')?.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
        toast.remove();
      });

      toast.querySelector('#repotap-close-btn')?.addEventListener('click', () => {
        toast.remove();
      });

      setTimeout(() => {
        if (toast.parentNode) toast.remove();
      }, 15000);
    } catch (_) {}
  }

  // ── Handle Accepted Submission ───────────────────────────────────────────

  async function handleAccepted(bridgePayload = null) {
    // The bridge and the DOM observer both fire for one submission; handle it once
    const slugGuess = (getEffectiveUrl().match(/\/problems\/([^/?#]+)/) || [])[1];
    if (!slugGuess) return;
    const now = Date.now();
    if (lastProcessedKey === slugGuess && now - lastProcessedAt < 20000) return;
    lastProcessedKey = slugGuess;
    lastProcessedAt = now;

    const code = bridgePayload?.code || (await requestBridgeCode()) || extractCode();
    const meta = getProblemMeta(code);

    console.log('[RepoTap GFG] 🎉 Problem Solved Successfully detected!', { meta, codeLength: code.length });

    const payload = {
      ...meta,
      code: code || '',
      stats: { runtime: null, memory: null },
      capturedAt: new Date().toISOString(),
    };

    chrome.runtime.sendMessage({
      type: 'SOLUTION_ACCEPTED',
      payload,
    }, (response) => {
      console.log('[RepoTap GFG] Sent to background, response:', response);
    });

    showFloatingBanner(meta);
  }

  // ── Listen for Bridge Messages ────────────────────────────────────────────

  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data || event.data.source !== 'REPOTAP_PAGE_BRIDGE') return;

    if (event.data.type === 'GFG_ACCEPTED') {
      console.log('[RepoTap GFG] Bridge reported accepted submission:', event.data.payload);
      handleAccepted(event.data.payload);
    }
  });

  // ── Continuous DOM Observer for GFG Solved Indicators ─────────────────────

  let debounceTimer = null;
  const observer = new MutationObserver(() => {
    if (debounceTimer) return;
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      checkDOMForSuccess();
    }, 600);
  });

  function checkDOMForSuccess() {
    try {
      const text = document.body ? document.body.innerText : '';
      // "Correct Answer" also appears for sample runs, so only the final submit verdict counts
      const isSolved = /Problem Solved Successfully/i.test(text);

      // Fire on the transition so an on-screen banner doesn't re-trigger every mutation
      if (isSolved && !solvedVisible) {
        console.log('[RepoTap GFG] Solved indicator found in DOM!');
        handleAccepted(null);
      }
      solvedVisible = isSolved;
    } catch (_) {}
  }

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }
})();
