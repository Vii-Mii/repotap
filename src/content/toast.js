/**
 * RepoTap — On-Page Aesthetic Animation & Toast Notification
 * Renders glassmorphic HUD confirmation directly on LeetCode, GFG, & HackerRank pages.
 */

(function () {
  'use strict';

  function injectAnimationStyles() {
  if (document.getElementById('repotap-hud-styles')) return;
  const style = document.createElement('style');
  style.id = 'repotap-hud-styles';
  style.textContent = `
    @keyframes repotap-slide-in {
      0% { opacity: 0; transform: translateY(35px) scale(0.92); }
      60% { opacity: 1; transform: translateY(-4px) scale(1.02); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes repotap-slide-out {
      0% { opacity: 1; transform: translateY(0) scale(1); }
      100% { opacity: 0; transform: translateY(20px) scale(0.94); }
    }
    @keyframes repotap-draw-check {
      0% { stroke-dashoffset: 36; }
      100% { stroke-dashoffset: 0; }
    }
    @keyframes repotap-glow-pulse {
      0%, 100% { box-shadow: 0 0 15px rgba(14, 165, 233, 0.4), inset 0 0 15px rgba(14, 165, 233, 0.2); }
      50% { box-shadow: 0 0 25px rgba(16, 185, 129, 0.6), inset 0 0 20px rgba(16, 185, 129, 0.3); }
    }
    @keyframes repotap-ripple {
      0% { transform: scale(0.8); opacity: 0.8; }
      100% { transform: scale(1.9); opacity: 0; }
    }
    @keyframes repotap-progress {
      0% { width: 100%; }
      100% { width: 0%; }
    }
    .repotap-hud-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483647;
      background: rgba(10, 12, 18, 0.90);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(14, 165, 233, 0.45);
      border-radius: 16px;
      padding: 16px 18px 14px 18px;
      box-shadow: 0 16px 45px rgba(0, 0, 0, 0.65), 0 0 30px rgba(14, 165, 233, 0.2);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #f8fafc;
      min-width: 330px;
      max-width: 390px;
      box-sizing: border-box;
      animation: repotap-slide-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      overflow: hidden;
    }
    .repotap-hud-container.closing {
      animation: repotap-slide-out 0.35s cubic-bezier(0.4, 0, 1, 1) forwards;
    }
    .repotap-check-circle {
      position: relative;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: linear-gradient(135deg, #0284c7, #059669);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      animation: repotap-glow-pulse 3s infinite ease-in-out;
    }
    .repotap-check-circle::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background: inherit;
      animation: repotap-ripple 2s infinite ease-out;
      z-index: -1;
    }
    .repotap-check-svg path {
      stroke: #ffffff;
      stroke-width: 3;
      stroke-linecap: round;
      stroke-linejoin: round;
      fill: none;
      stroke-dasharray: 36;
      stroke-dashoffset: 36;
      animation: repotap-draw-check 0.6s 0.2s cubic-bezier(0.65, 0, 0.45, 1) forwards;
    }
    .repotap-progress-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 3px;
      background: linear-gradient(90deg, #38bdf8, #34d399);
      animation: repotap-progress 7s linear forwards;
    }
    .repotap-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 7px;
      border-radius: 9999px;
      font-size: 10px;
      font-weight: 600;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      background: rgba(14, 165, 233, 0.15);
      border: 1px solid rgba(56, 189, 248, 0.3);
      color: #38bdf8;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Shows the super aesthetic auto-commit confirmation animation.
 */
function showAutoCommitAnimation({ title, filePath, commitUrl, timeComplexity, spaceComplexity, platform }) {
  injectAnimationStyles();

  // Remove existing toast if any
  const existing = document.getElementById('repotap-hud-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'repotap-hud-toast';
  toast.className = 'repotap-hud-container';

  toast.innerHTML = `
    <div style="display: flex; align-items: flex-start; gap: 12px;">
      <!-- Glowing Animated Checkmark -->
      <div class="repotap-check-circle">
        <svg class="repotap-check-svg" width="20" height="20" viewBox="0 0 24 24">
          <path d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <!-- Info Column -->
      <div style="flex: 1; min-width: 0;">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 3px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 11px; font-weight: 800; letter-spacing: 0.6px; color: #38bdf8; text-transform: uppercase;">
              RepoTap Auto-Committed
            </span>
            <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #34d399; box-shadow: 0 0 8px #34d399;"></span>
          </div>
          <button id="repotap-hud-dismiss" style="background: transparent; border: none; color: #64748b; font-size: 14px; cursor: pointer; padding: 0 2px; line-height: 1; transition: color 0.15s;" title="Dismiss">
            ✕
          </button>
        </div>

        <div style="font-size: 13px; font-weight: 700; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.3;">
          ${title || 'Solution'}
        </div>

        <div style="font-size: 11px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: #94a3b8; margin-top: 3px; display: flex; align-items: center; gap: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          <span style="color: #38bdf8;">📁</span>
          <span style="overflow: hidden; text-overflow: ellipsis;">${filePath || 'solution'}</span>
        </div>

        <!-- Complexity Pills -->
        <div style="display: flex; align-items: center; gap: 6px; margin-top: 8px;">
          ${timeComplexity ? `<span class="repotap-badge">⚡ ${timeComplexity}</span>` : ''}
          ${spaceComplexity ? `<span class="repotap-badge">💾 ${spaceComplexity}</span>` : ''}
        </div>
      </div>
    </div>

    <!-- Bottom Actions -->
    <div style="display: flex; align-items: center; justify-content: flex-end; gap: 8px; margin-top: 12px; padding-top: 10px; border-top: 1px solid rgba(255, 255, 255, 0.08);">
      ${commitUrl ? `
        <a href="${commitUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 4px; padding: 5px 12px; background: linear-gradient(135deg, #0284c7, #0ea5e9); color: #ffffff; font-size: 11px; font-weight: 600; border-radius: 8px; text-decoration: none; transition: transform 0.15s, opacity 0.15s; box-shadow: 0 2px 8px rgba(14, 165, 233, 0.35);">
          <span>View Commit</span>
          <span style="font-size: 12px;">↗</span>
        </a>
      ` : ''}
    </div>

    <!-- Countdown Progress Line -->
    <div class="repotap-progress-bar"></div>
  `;

  document.body.appendChild(toast);

  const closeToast = () => {
    toast.classList.add('closing');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 350);
  };

  toast.querySelector('#repotap-hud-dismiss')?.addEventListener('click', closeToast);

  // Auto-dismiss after 7 seconds
  const timer = setTimeout(closeToast, 7000);

  // Pause countdown on hover
  toast.addEventListener('mouseenter', () => {
    clearTimeout(timer);
    const pb = toast.querySelector('.repotap-progress-bar');
    if (pb) pb.style.animationPlayState = 'paused';
  });

  toast.addEventListener('mouseleave', () => {
    setTimeout(closeToast, 3000);
  });
}

/**
 * Shows the manual review prompt floating banner.
 */
function showManualReviewPrompt({ title, platform }) {
  injectAnimationStyles();

  if (document.getElementById('repotap-floating-toast') || document.getElementById('repotap-hud-toast')) return;

  const toast = document.createElement('div');
  toast.id = 'repotap-floating-toast';
  toast.className = 'repotap-hud-container';

  toast.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px;">
      <div style="width: 34px; height: 34px; border-radius: 10px; background: linear-gradient(135deg, #0284c7, #38bdf8); display: flex; align-items: center; justify-content: center; font-size: 17px; flex-shrink: 0; box-shadow: 0 0 15px rgba(14, 165, 233, 0.4);">
        ⚡
      </div>
      <div style="flex: 1; min-width: 0;">
        <div style="font-size: 10px; font-weight: 800; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.5px;">
          RepoTap Solved!
        </div>
        <div style="font-size: 12px; font-weight: 600; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          ${title || 'Solution'}
        </div>
        <div style="font-size: 10px; color: #94a3b8;">
          ✨ Auto-suggestions ready to review
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 6px;">
        <button id="repotap-open-btn" style="background: linear-gradient(135deg, #0284c7, #0ea5e9); color: white; border: none; padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer; box-shadow: 0 2px 10px rgba(14, 165, 233, 0.4);">
          Review & Commit
        </button>
        <button id="repotap-close-btn" style="background: transparent; color: #64748b; border: none; padding: 4px 6px; font-size: 13px; cursor: pointer;">
          ✕
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(toast);

  const closeToast = () => {
    toast.classList.add('closing');
    setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 350);
  };

  toast.querySelector('#repotap-open-btn')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
    closeToast();
  });

  toast.querySelector('#repotap-close-btn')?.addEventListener('click', closeToast);

  setTimeout(closeToast, 15000);
}

if (typeof window !== 'undefined') {
  window.__REPOTAP_TOAST__ = {
    injectAnimationStyles,
    showAutoCommitAnimation,
    showManualReviewPrompt,
  };
}
})();

