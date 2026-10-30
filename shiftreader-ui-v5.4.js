/* ShiftReader UI v5.4
   Presentation helpers only. Load after the main app and timetable addon.
   Important: this file does not inspect, resize, or rewrite timetable rows. */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  let review = null;
  let lastStatus = '';
  let panelObserverQueued = false;

  function restyleOcrModePanel() {
    const panel = $('ocrModePanel');
    if (!panel) return;

    panel.classList.add('sr-ocr-panel');
    panel.querySelectorAll('label').forEach(label => {
      label.classList.add('sr-ocr-option');
    });

    panel.querySelectorAll('input[type="radio"]').forEach(input => {
      input.classList.add('sr-ocr-radio');
    });

    $('ocrModeDecision')?.classList.add('sr-ocr-decision');
  }

  function queuePanelRestyle() {
    if (panelObserverQueued) return;
    panelObserverQueued = true;
    requestAnimationFrame(() => {
      panelObserverQueued = false;
      restyleOcrModePanel();
    });
  }

  function toast(title, message, kind = 'info') {
    if (!message) return;

    let stack = $('appToastStack');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'appToastStack';
      stack.className = 'app-toast-stack';
      stack.setAttribute('aria-live', 'polite');
      document.body.append(stack);
    }

    const row = document.createElement('div');
    row.className = `app-toast ${kind}`;

    const strong = document.createElement('strong');
    const span = document.createElement('span');
    strong.textContent = title;
    span.textContent = message;
    row.append(strong, span);
    stack.append(row);

    requestAnimationFrame(() => row.classList.add('show'));
    setTimeout(() => row.classList.add('fade'), 3000);
    setTimeout(() => row.remove(), 3650);
  }

  function ensureReview() {
    if (review?.isConnected) return review;

    review = document.createElement('section');
    review.id = 'ocrReview';
    review.className = 'ocr-review';
    review.setAttribute('role', 'status');
    review.innerHTML = `
      <div>
        <h3>Check the extracted times</h3>
        <p id="ocrReviewText">Review the extracted schedule and verify the visible times.</p>
      </div>
      <div class="ocr-review-actions">
        <button type="button" class="primary" id="ocrReviewOkay">Looks good</button>
        <button type="button" class="secondary" id="ocrReviewFix">Need fix</button>
      </div>`;

    document.body.append(review);

    $('ocrReviewOkay').onclick = () => review.classList.remove('show');
    $('ocrReviewFix').onclick = () => {
      review.classList.remove('show');
      const target = $('preview') || $('drop') || document.querySelector('.drop');
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    return review;
  }

  function showReview(mode = '') {
    const box = ensureReview();
    const text = $('ocrReviewText');
    if (text) {
      text.textContent = /paddle/i.test(mode)
        ? 'PaddleOCR completed. Verify the visible times before saving.'
        : 'OCR completed. Review the extracted times before accepting the result.';
    }
    box.classList.add('show');
  }

  function observeStatus() {
    const statusElement = $('status');
    if (!statusElement) return;

    const inspect = () => {
      const text = statusElement.textContent.trim();
      if (!text || text === lastStatus) return;
      lastStatus = text;

      if (statusElement.classList.contains('bad')) {
        toast('Review needed', text, 'warn');
      } else if (statusElement.classList.contains('ok')) {
        toast('Process complete', text, 'ok');
      }
    };

    new MutationObserver(inspect).observe(statusElement, {
      attributes: true,
      attributeFilter: ['class'],
      childList: true,
      subtree: true,
      characterData: true
    });

    inspect();
  }

  function polish() {
    document.title = 'ShiftReader';
    const heading = document.querySelector('header h1');
    const subtitle = document.querySelector('header h1 + div');
    if (heading) heading.textContent = 'ShiftReader';
    if (subtitle) subtitle.textContent = 'Automatic timetable reading and OCR review';
    restyleOcrModePanel();
  }

  observeStatus();
  polish();

  new MutationObserver(queuePanelRestyle).observe(document.body, {
    childList: true,
    subtree: true
  });

  // Optional public hook for the OCR code.
  window.shiftReaderShowReview = showReview;
})();
