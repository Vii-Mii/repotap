/**
 * RepoTap — Page Bridge (Runs in MAIN world)
 * Has direct access to window.monaco, window.ace, and native window.fetch / XMLHttpRequest.
 * Communicates with isolated content scripts via window.postMessage.
 */

(function () {
  'use strict';

  console.log('[RepoTap Bridge] Initialized in MAIN world.');

  // Helper to extract code from whatever editor is active on page
  function getEditorCode() {
    // 1. Monaco Editor (LeetCode, HackerRank, etc.)
    try {
      if (window.monaco && window.monaco.editor) {
        const models = window.monaco.editor.getModels();
        if (models && models.length > 0) {
          // Look for the model with actual code
          for (const m of models) {
            const val = m.getValue();
            if (val && val.trim().length > 0) return val;
          }
          return models[0].getValue();
        }
      }
    } catch (e) {
      console.warn('[RepoTap Bridge] Monaco read error:', e);
    }

    // 2. Ace Editor (GeeksForGeeks, HackerRank)
    try {
      const aceNodes = document.querySelectorAll('.ace_editor');
      if (aceNodes.length > 0) {
        for (const node of aceNodes) {
          try {
            const editor = node.env?.editor || (window.ace && window.ace.edit(node));
            if (editor) {
              const val = editor.getValue();
              if (val && val.trim().length > 0) return val;
            }
          } catch (_) {}
        }
      }
    } catch (e) {
      console.warn('[RepoTap Bridge] Ace read error:', e);
    }

    // 3. CodeMirror
    try {
      const cmEl = document.querySelector('.CodeMirror');
      if (cmEl && cmEl.CodeMirror) {
        return cmEl.CodeMirror.getValue();
      }
    } catch (e) {
      console.warn('[RepoTap Bridge] CodeMirror read error:', e);
    }

    return null;
  }

  // Respond to code requests from isolated content script
  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data || event.data.source !== 'REPOTAP_CONTENT_SCRIPT') return;

    if (event.data.type === 'REQUEST_CODE') {
      const code = getEditorCode();
      window.postMessage({
        source: 'REPOTAP_PAGE_BRIDGE',
        type: 'CODE_RESPONSE',
        requestId: event.data.requestId,
        code: code || '',
      }, '*');
    }
  });

  // ── GeeksForGeeks detection (shared by fetch + XHR) ─────────────────────

  function isGfgHost(url) {
    try {
      return new URL(url, location.href).hostname.endsWith('geeksforgeeks.org');
    } catch (_) {
      return false;
    }
  }

  function inspectGfgResponse(url, bodyText) {
    try {
      if (!bodyText || bodyText.length > 500000 || !isGfgHost(url)) return;

      let solved = /problem solved successfully/i.test(bodyText);

      // GFG polls .../problems/submission/submit/result/ (axios → XHR) and reports
      // the verdict as view_mode: "correct". The compile-run endpoint is sample runs only.
      if (!solved && /problems\/submission\/submit\/result/i.test(url)) {
        try {
          const data = JSON.parse(bodyText);
          const r = data?.results || data;
          const total = Number(r?.total_test_cases) || 0;
          const processed = Number(r?.test_cases_processed) || 0;
          solved = r?.view_mode === 'correct' && (!total || processed >= total);
        } catch (_) {}
      }

      if (!solved) return;
      console.log('[RepoTap Bridge] GFG solved response detected:', url);
      window.postMessage({
        source: 'REPOTAP_PAGE_BRIDGE',
        type: 'GFG_ACCEPTED',
        payload: {
          status: 'Problem Solved Successfully',
          code: getEditorCode() || '',
        },
      }, '*');
    } catch (_) {}
  }

  // ── Network Interception (Fetch & XHR) ───────────────────────────────────

  // 1. Monkey-patch window.fetch
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);
    try {
      const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');

      // LeetCode: Submission check endpoint /submissions/detail/<id>/check/
      if (url.includes('/check/')) {
        const clone = response.clone();
        clone.json().then((data) => {
          console.log('[RepoTap Bridge] LeetCode check response:', data);
          if (data && data.state === 'SUCCESS' && data.status_msg === 'Accepted') {
            const code = getEditorCode();
            window.postMessage({
              source: 'REPOTAP_PAGE_BRIDGE',
              type: 'LEETCODE_ACCEPTED',
              payload: {
                status: 'Accepted',
                runtime: data.status_runtime || data.runtime || null,
                memory: data.status_memory || data.memory || null,
                code: code || '',
                submissionId: data.submission_id || null,
                lang: data.lang || null,
              },
            }, '*');
          }
        }).catch(() => {});
      }

      // LeetCode: GraphQL submission details
      if (url.includes('/graphql') || url.includes('/graphql/')) {
        const postBody = args[1]?.body;
        if (typeof postBody === 'string' && postBody.includes('submissionDetails')) {
          const clone = response.clone();
          clone.json().then((data) => {
            const details = data?.data?.submissionDetails;
            if (details && (details.statusCode === 10 || details.statusMessage === 'Accepted')) {
              window.postMessage({
                source: 'REPOTAP_PAGE_BRIDGE',
                type: 'LEETCODE_ACCEPTED',
                payload: {
                  status: 'Accepted',
                  runtime: details.runtime || null,
                  memory: details.memory || null,
                  code: details.code || getEditorCode() || '',
                  lang: details.lang?.verboseName || details.lang?.name || null,
                  question: details.question || null,
                },
              }, '*');
            }
          }).catch(() => {});
        }
      }

      // GeeksForGeeks: any API response on a geeksforgeeks.org host
      if (isGfgHost(url)) {
        response.clone().text().then((text) => inspectGfgResponse(url, text)).catch(() => {});
      }
    } catch (err) {
      // Never break page functionality
    }
    return response;
  };

  // 2. Monkey-patch XMLHttpRequest
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this._rt_url = url;
    return originalOpen.apply(this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.send = function (...args) {
    this.addEventListener('load', () => {
      try {
        const url = this._rt_url || '';
        if (isGfgHost(url)) {
          const body = (this.responseType === '' || this.responseType === 'text')
            ? this.responseText
            : (this.responseType === 'json' ? JSON.stringify(this.response) : '');
          inspectGfgResponse(url, body);
        }
        if (url.includes('/check/')) {
          const data = JSON.parse(this.responseText);
          if (data && data.state === 'SUCCESS' && data.status_msg === 'Accepted') {
            const code = getEditorCode();
            window.postMessage({
              source: 'REPOTAP_PAGE_BRIDGE',
              type: 'LEETCODE_ACCEPTED',
              payload: {
                status: 'Accepted',
                runtime: data.status_runtime || null,
                memory: data.status_memory || null,
                code: code || '',
                submissionId: data.submission_id || null,
                lang: data.lang || null,
              },
            }, '*');
          }
        }
      } catch (_) {}
    });
    return originalSend.apply(this, args);
  };
})();

