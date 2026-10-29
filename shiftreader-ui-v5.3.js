/* ShiftReader UI, review notices, and improved alarm sound v5.3. Load last. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let review = null, lastStatus = '', alarmEngine = null;

  function restyleOcrModePanel() {
    const panel = $('ocrModePanel');
    if (!panel) return;

    panel.classList.add('sr-ocr-panel');
    panel.querySelectorAll('label').forEach(label => {
      label.classList.add('sr-ocr-option');
    });

    const decision = $('ocrModeDecision');
    if (decision) decision.classList.add('sr-ocr-decision');

    panel.querySelectorAll('input[type="radio"]').forEach(input => {
      input.classList.add('sr-ocr-radio');
    });
  }

  function toast(title, message, kind = '') {
    let stack = $('appToastStack');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'appToastStack';
      stack.className = 'app-toast-stack';
      document.body.append(stack);
    }
    const row = document.createElement('div');
    row.className = 'app-toast ' + (kind || 'info');
    row.innerHTML = `<strong>${title}</strong><span>${message}</span>`;
    stack.append(row);
    setTimeout(() => row.classList.add('show'), 25);
    setTimeout(() => row.classList.add('fade'), 3000);
    setTimeout(() => row.remove(), 3700);
  }

  function ensureReview() {
    if (review) return review;
    review = document.createElement('div');
    review.id = 'ocrReview';
    review.className = 'ocr-review';
    review.innerHTML = `
      <h3>⚠️ Check the extracted times</h3>
      <p id="ocrReviewText">Review the extracted schedule and verify the visible times.</p>
      <div class="ocr-review-actions">
        <button type="button" class="primary" id="ocrReviewOkay">Looks good</button>
        <button type="button" class="secondary" id="ocrReviewFix">Need fix</button>
      </div>`;
    document.body.append(review);
    review.querySelector('#ocrReviewOkay').onclick = () => review.classList.remove('show');
    review.querySelector('#ocrReviewFix').onclick = () => {
      review.classList.remove('show');
      const modal = document.querySelector('.sr-modal.show, .alarmModal.show');
      if (modal) modal.scrollIntoView({behavior:'smooth',block:'center'});
    };
    return review;
  }

  function showReview(mode) {
    const r = ensureReview();
    r.classList.remove('okay');
    r.classList.add('show');
    const paddle = /paddle/i.test(mode);
    $('ocrReviewText').textContent = paddle ?
      'PaddleOCR completed. Still verify the visible times before saving.' :
      'The OCR result is ready. Review the extracted times before accepting it.';
  }

  function observeStatus() {
    const el = $('status');
    if (!el) return;
    new MutationObserver(() => {
      const t = el.textContent.trim();
      if (!t || t === lastStatus) return;
      lastStatus = t;
      if (el.classList.contains('bad')) toast('Review needed', t, 'warn');
      if (el.classList.contains('ok')) toast('Process complete', t, 'ok');
    }).observe(el, { childList: true, subtree: true, characterData: true });
  }

  function createAlarmEngine() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();
    const master = ctx.createGain();
    master.gain.value = .28;
    master.connect(ctx.destination);
    let playing = false;
    let timer = null;

    function tone(freq, start, duration, volume = .22, type = 'sine') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + .01);
      gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
      osc.connect(gain);
      gain.connect(master);
      osc.start(start);
      osc.stop(start + duration + .03);
    }

    function chord() {
      if (!playing) return;
      ctx.resume();
      const n = ctx.currentTime + .03;
      tone(523.25, n, .42, .22);
      tone(659.25, n + .16, .5, .2);
      tone(783.99, n + .34, .72, .18);
      tone(1046.5, n + .38, .65, .08, 'triangle');
      timer = setTimeout(chord, 1250);
    }

    return {
      start() {
        if (playing) return;
        playing = true;
        chord();
      },
      stop() {
        playing = false;
        clearTimeout(timer);
      }
    };
  }

  function improveAlarm() {
    alarmEngine = createAlarmEngine();
    const nativeCreate = (window.AudioContext || window.webkitAudioContext)?.prototype?.createOscillator;
    if (nativeCreate) {
      const proto = window.AudioContext.prototype;
      if (!proto.__srPatched) {
        proto.__srPatched = true;
        const old = proto.createOscillator;
        proto.createOscillator = function (...args) {
          const osc = old.call(this, ...args);
          osc.type = 'sine';
          return osc;
        };
      }
    }

    const observer = new MutationObserver(() => {
      const modal = document.querySelector('.alarmModal.show,.sr-modal.show');
      if (modal) {
        alarmEngine?.start();
        const bell = modal.querySelector('.alarmBell,.sr-bell');
        if (bell) bell.classList.add('ringing');
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }

  function polish() {
    document.title = 'ShiftReader';
    const h = document.querySelector('header h1');
    if (h) h.textContent = 'ShiftReader';
    const sub = document.querySelector('header h1 + div');
    if (sub) sub.textContent = 'Automatic timetable reading and OCR review';
    restyleOcrModePanel();
  }

  observeStatus();
  improveAlarm();
  polish();
  new MutationObserver(() => restyleOcrModePanel()).observe(document.body, { childList: true, subtree: true });
})();
