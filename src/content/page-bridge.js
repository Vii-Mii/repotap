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

  // ── LeetCode: tell real submissions apart from test runs ─────────────────
  // Run ("Run" button) polls /submissions/detail/runcode_xxx/check/ and can also say
  // "Accepted"; a real submission polls /submissions/detail/<numeric id>/check/.

  let lastSubmitStartedAt = 0;

  function noteSubmitRequest(url, method) {
    if (/\/problems\/[^/]+\/submit\/?(\?|$)/.test(url) && (!method || method.toUpperCase() === 'POST')) {
      lastSubmitStartedAt = Date.now();
    }
  }

  // Decided by URL only: response fields such as run_success appear on submissions too.
  function isRealSubmissionCheck(url) {
    if (/runcode|interpret_solution/i.test(url)) return false;
    // Optional version segment: /submissions/detail/<id>/check/ or /submissions/detail/<id>/v2/check/
    const m = url.match(/\/submissions\/detail\/([^/]+)\/(?:v\d+\/)?check\//);
    return !!m && /^\d+$/.test(m[1]);
  }

  function formatMemory(data) {
    if (data.status_memory) return data.status_memory;
    return typeof data.memory === 'number' ? `${(data.memory / 1048576).toFixed(1)} MB` : (data.memory || null);
  }

  // Final verdict: Accepted is status_code 10 / status_msg "Accepted"; PENDING/STARTED are not final
  function isAcceptedVerdict(data) {
    if (!data || data.state === 'PENDING' || data.state === 'STARTED') return false;
    return data.status_code === 10 || data.status_msg === 'Accepted';
  }

  // ── Network Interception (Fetch & XHR) ───────────────────────────────────

  // 1. Monkey-patch window.fetch
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);
    try {
      const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
      noteSubmitRequest(url, args[1]?.method || (typeof args[0] !== 'string' ? args[0]?.method : 'GET'));

      // LeetCode: Submission check endpoint /submissions/detail/<id>/check/
      if (url.includes('/check/')) {
        const clone = response.clone();
        clone.json().then((data) => {
          console.log('[RepoTap Bridge] LeetCode check response:', data);
          if (isAcceptedVerdict(data) && !isRealSubmissionCheck(url)) console.log('[RepoTap Bridge] Ignored accepted test run:', url);
          if (isAcceptedVerdict(data) && isRealSubmissionCheck(url)) {
            const code = getEditorCode();
            window.postMessage({
              source: 'REPOTAP_PAGE_BRIDGE',
              type: 'LEETCODE_ACCEPTED',
              payload: {
                status: 'Accepted',
                runtime: data.status_runtime || data.runtime || null,
                memory: formatMemory(data),
                code: code || '',
                submissionId: data.submission_id || (url.match(/\/submissions\/detail\/(\d+)\//) || [])[1] || null,
                lang: data.lang || null,
              },
            }, '*');
          }
        }).catch(() => {});
      }

      // LeetCode: GraphQL submission details
      if (url.includes('/graphql') || url.includes('/graphql/')) {
        {
          const clone = response.clone();
          clone.json().then((data) => {
            const details = data?.data?.submissionDetails;
            if (!details) return;
            const accepted = details.statusCode === 10 || details.statusMessage === 'Accepted';

            // A verdict is "new" if we just saw a submit request, or the submission itself is only
            // moments old (covers pages that reload onto /submissions/<id>/ after Submit).
            const ageMs = details.timestamp ? Date.now() - Number(details.timestamp) * 1000 : Infinity;
            const submittedJustNow = Date.now() - lastSubmitStartedAt < 120000;
            const isFresh = submittedJustNow || ageMs < 180000;
            console.log('[RepoTap Bridge] LeetCode submissionDetails:', { accepted, fresh: isFresh, ageSec: Math.round(ageMs / 1000), submittedJustNow });
            if (!accepted || !isFresh) return;

            window.postMessage({
              source: 'REPOTAP_PAGE_BRIDGE',
              type: 'LEETCODE_ACCEPTED',
              payload: {
                status: 'Accepted',
                runtime: details.runtimeDisplay || details.runtime || null,
                memory: details.memoryDisplay || formatMemory(details),
                code: details.code || getEditorCode() || '',
                lang: details.lang?.verboseName || details.lang?.name || null,
                submissionId: (location.pathname.match(/\/submissions\/(\d+)/) || [])[1] || null,
                question: details.question || null,
              },
            }, '*');
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
    noteSubmitRequest(String(url), method);
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
          if (isAcceptedVerdict(data) && isRealSubmissionCheck(url)) {
            const code = getEditorCode();
            window.postMessage({
              source: 'REPOTAP_PAGE_BRIDGE',
              type: 'LEETCODE_ACCEPTED',
              payload: {
                status: 'Accepted',
                runtime: data.status_runtime || null,
                memory: formatMemory(data),
                code: code || '',
                submissionId: data.submission_id || (url.match(/\/submissions\/detail\/(\d+)\//) || [])[1] || null,
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

