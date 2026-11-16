/**
 * RepoTap — GeeksForGeeks Content Script
 * Supports top frame & iframe playgrounds.
 * Continuous observer for "Problem Solved Successfully", "Correct Answer", etc.
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

      // Topic tags
      const topicTags = [];
      try {
        topDoc.querySelectorAll('.problems_tag_container a, [class*="topicTag"], a[href*="/explore?category"], [class*="tag"]').forEach(el => {
          const txt = el.textContent.trim();
          if (txt && !topicTags.includes(txt)) topicTags.push(txt);
        });
      } catch (_) {}

      return {
        title,
        slug,
        difficulty,
        language: detectLanguage(langGuess, code),
        topicTags,
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
      if (response?.autoSaved) {
        if (response.data) _showAutoCommitAnimation(response.data);
      } else {
        _showManualReviewPrompt(meta);
      }
    });
  }

  // Listen for auto-commit confirmation animation
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'AUTOSAVE_COMMITTED') {
      _showAutoCommitAnimation(msg.data);
    }
  });

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
