/* ShiftReader alarm-only upgrade v1.1
   Load AFTER timetable-addon-v3.9.js.
   Alarm audio only. No layout, spacing, sizing, OCR, or timetable styles. */
(() => {
  'use strict';

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  const ALARM_DURATION_MS = 60000;
  let context = null;
  let master = null;
  let compressor = null;
  let cycleTimer = 0;
  let closeTimer = 0;
  let alarmStartedAt = 0;
  let running = false;
  let replacingOriginalAlarm = false;
  let phraseIndex = 0;

  function ensureAudio() {
    if (!context || context.state === 'closed') {
      context = new AudioContextClass();

      master = context.createGain();
      master.gain.value = 0.0001;

      compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.knee.value = 12;
      compressor.ratio.value = 5;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.2;

      master.connect(compressor);
      compressor.connect(context.destination);
    }
    return context.resume();
  }

  function tone(frequency, start, duration, volume, type = 'sine', endFrequency = frequency) {
    if (!context || !master) return;

    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (endFrequency !== frequency) {
      oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
    }

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + 0.015);
    gain.gain.setValueAtTime(Math.max(0.0002, volume), Math.max(start + 0.02, start + duration - 0.05));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  }

  function playPhrase() {
    if (!running || !context || !master) return;

    const elapsed = Math.max(0, (performance.now() - alarmStartedAt) / 1000);
    const progress = Math.min(1, elapsed / 10);

    // Noticeably louder from the start, rising over ten seconds.
    const level = 0.34 + progress * 0.50;
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.setTargetAtTime(level, context.currentTime, 0.04);

    const now = context.currentTime + 0.025;
    const variants = [
      [523.25, 659.25, 783.99],
      [587.33, 739.99, 880.00],
      [523.25, 698.46, 830.61],
      [659.25, 783.99, 987.77]
    ];
    const notes = variants[phraseIndex % variants.length];
    const wobble = phraseIndex % 2 === 0 ? 1 : 1.015;

    tone(notes[0] * wobble, now,        0.22, 0.24, 'sine');
    tone(notes[1],          now + 0.17, 0.24, 0.22, 'triangle');
    tone(notes[2],          now + 0.35, 0.31, 0.21, 'sine', notes[2] * 1.025);

    if (progress > 0.20) {
      tone(notes[0] / 2, now + 0.02, 0.50, 0.09 + progress * 0.06, 'triangle');
    }
    if (phraseIndex % 3 === 2) {
      tone(notes[1] * 1.5, now + 0.68, 0.18, 0.14 + progress * 0.05, 'sine');
    }

    phraseIndex += 1;
    const delays = [940, 1070, 990, 1130];
    cycleTimer = window.setTimeout(
      playPhrase,
      Math.max(700, delays[phraseIndex % delays.length] - progress * 150)
    );
  }

  function pressExistingStop(modal) {
    const stopButton = modal?.querySelector('#srStop, .sr-stop');
    if (stopButton) stopButton.click();
    else modal?.classList.remove('show');
  }

  async function startAlarm(modal) {
    if (running || replacingOriginalAlarm) return;
    replacingOriginalAlarm = true;

    // Stop the addon's original continuous tone, then reuse its existing modal.
    pressExistingStop(modal);
    await ensureAudio().catch(() => {});

    modal.classList.add('show');
    running = true;
    replacingOriginalAlarm = false;
    phraseIndex = 0;
    alarmStartedAt = performance.now();

    clearTimeout(closeTimer);
    closeTimer = window.setTimeout(() => {
      stopAlarm();
      pressExistingStop(modal);
    }, ALARM_DURATION_MS);

    playPhrase();
  }

  function stopAlarm() {
    running = false;
    replacingOriginalAlarm = false;
    clearTimeout(cycleTimer);
    clearTimeout(closeTimer);
    cycleTimer = 0;
    closeTimer = 0;

    if (context && master) {
      const now = context.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setTargetAtTime(0.0001, now, 0.02);
    }
  }

  function inspectAlarm() {
    const modal = document.getElementById('srModal');
    if (!modal) return;

    if (modal.classList.contains('show')) {
      if (!running && !replacingOriginalAlarm) startAlarm(modal);
    } else if (running && !replacingOriginalAlarm) {
      stopAlarm();
    }
  }

  new MutationObserver(inspectAlarm).observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class']
  });

  window.addEventListener('pagehide', stopAlarm);
  inspectAlarm();
})();
