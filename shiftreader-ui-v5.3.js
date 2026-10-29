/* ShiftReader UI, review notices, alarm sound, and timetable repair v5.3. Load last. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let review = null, lastStatus = '', alarmEngine = null;

  function restyleOcrModePanel() {
    const panel = $('ocrModePanel');
    if (!panel) return;
    panel.classList.add('sr-ocr-panel');
    panel.querySelectorAll('label').forEach(label => label.classList.add('sr-ocr-option'));
    const decision = $('ocrModeDecision');
    if (decision) decision.classList.add('sr-ocr-decision');
    panel.querySelectorAll('input[type="radio"]').forEach(input => input.classList.add('sr-ocr-radio'));
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
    const strong = document.createElement('strong');
    const span = document.createElement('span');
    strong.textContent = title;
    span.textContent = message;
    row.append(strong, span);
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
    review.innerHTML = '<h3>⚠️ Check the extracted times</h3><p id="ocrReviewText">Review the extracted schedule and verify the visible times.</p><div class="ocr-review-actions"><button type="button" class="primary" id="ocrReviewOkay">Looks good</button><button type="button" class="secondary" id="ocrReviewFix">Need fix</button></div>';
    document.body.append(review);
    review.querySelector('#ocrReviewOkay').onclick = () => review.classList.remove('show');
    review.querySelector('#ocrReviewFix').onclick = () => {
      review.classList.remove('show');
      const modal = document.querySelector('.sr-modal.show, .alarmModal.show');
      if (modal) modal.scrollIntoView({behavior:'smooth', block:'center'});
    };
    return review;
  }

  function showReview(mode) {
    const r = ensureReview();
    r.classList.remove('okay');
    r.classList.add('show');
    const text = $('ocrReviewText');
    if (text) text.textContent = /paddle/i.test(mode) ? 'PaddleOCR completed. Still verify the visible times before saving.' : 'The OCR result is ready. Review the extracted times before accepting it.';
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
    }).observe(el, {childList:true, subtree:true, characterData:true});
  }

  function createAlarmEngine() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();
    const master = ctx.createGain();
    master.gain.value = .28;
    master.connect(ctx.destination);
    let playing = false, timer = null;
    function tone(freq, start, duration, volume = .22, type = 'sine') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + .01);
      gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
      osc.connect(gain); gain.connect(master); osc.start(start); osc.stop(start + duration + .03);
    }
    function chord() {
      if (!playing) return;
      ctx.resume();
      const n = ctx.currentTime + .03;
      tone(523.25,n,.42,.22); tone(659.25,n+.16,.5,.2); tone(783.99,n+.34,.72,.18); tone(1046.5,n+.38,.65,.08,'triangle');
      timer = setTimeout(chord,1250);
    }
    return {start(){if(playing)return;playing=true;chord();}, stop(){playing=false;clearTimeout(timer);}};
  }

  function improveAlarm() {
    alarmEngine = createAlarmEngine();
    const observer = new MutationObserver(() => {
      const modal = document.querySelector('.alarmModal.show,.sr-modal.show');
      if (modal) {
        alarmEngine?.start();
        modal.querySelector('.alarmBell,.sr-bell')?.classList.add('ringing');
      } else {
        alarmEngine?.stop();
      }
    });
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  }

  const visibleChildren = element => Array.from(element?.children || []).filter(child => {
    const style = getComputedStyle(child);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });

  function findTimeAxis(root) {
    return Array.from(root.querySelectorAll('div,header,section'))
      .map(element => {
        const children = visibleChildren(element);
        const times = children.filter(child => /^\s*(?:[01]?\d|2[0-3]):[0-5]\d\s*$/.test(child.textContent || ''));
        return {element, children, times};
      })
      .filter(item => item.times.length >= 4)
      .sort((a,b) => b.times.length - a.times.length || a.children.length - b.children.length)[0] || null;
  }

  function directChildContaining(parent, node) {
    let current = node;
    while (current && current.parentElement !== parent) current = current.parentElement;
    return current && current.parentElement === parent ? current : null;
  }

  function findScheduleRow(node) {
    let current = node;
    while (current?.parentElement) {
      const parent = current.parentElement;
      const children = visibleChildren(parent);
      if (children.length >= 2 && children.length <= 4) return parent;
      current = parent;
    }
    return null;
  }

  function repairTimetableLayout() {
    const timetable = document.querySelector('.sr-timetable') || document.querySelector('[class*="timetable"]');
    if (!timetable) return;
    const axisInfo = findTimeAxis(timetable);
    if (!axisInfo) return;
    const headerRow = findScheduleRow(axisInfo.element);
    if (!headerRow) return;
    const timelineCell = directChildContaining(headerRow, axisInfo.element);
    if (!timelineCell) return;

    axisInfo.element.classList.add('sr-fixed-time-axis');
    axisInfo.element.style.setProperty('--sr-time-count', String(axisInfo.times.length));
    headerRow.classList.add('sr-fixed-schedule-head');
    timelineCell.classList.add('sr-fixed-timeline-cell');
    visibleChildren(headerRow).find(child => child !== timelineCell)?.classList.add('sr-fixed-employee-cell');

    Array.from(timetable.querySelectorAll('div,article,section,li')).forEach(row => {
      if (row === headerRow || row.contains(headerRow) || row.closest('.sr-fixed-timeline-cell')) return;
      const children = visibleChildren(row);
      if (children.length < 2 || children.length > 4) return;
      const timelineCandidate = children.find(child => ((child.textContent || '').match(/\b(?:[01]?\d|2[0-3]):[0-5]\d\b/g) || []).length >= 2);
      if (!timelineCandidate) return;
      if (row.parentElement?.closest('.sr-fixed-schedule-row')) return;
      row.classList.add('sr-fixed-schedule-row');
      timelineCandidate.classList.add('sr-fixed-timeline-cell','sr-fixed-break-track');
      children.find(child => child !== timelineCandidate)?.classList.add('sr-fixed-employee-cell');
    });
  }

  function scheduleTimetableRepair() {
    cancelAnimationFrame(scheduleTimetableRepair.frame);
    scheduleTimetableRepair.frame = requestAnimationFrame(() => {
      repairTimetableLayout();
      setTimeout(repairTimetableLayout,80);
      setTimeout(repairTimetableLayout,300);
    });
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
  scheduleTimetableRepair();
  new MutationObserver(() => {restyleOcrModePanel();scheduleTimetableRepair();}).observe(document.body,{childList:true,subtree:true});
  window.addEventListener('resize',scheduleTimetableRepair);
  document.fonts?.ready?.then(scheduleTimetableRepair);
})();
