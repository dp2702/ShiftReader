/* ShiftReader alarm-only upgrade v1.0
   Load AFTER timetable-addon-v3.9.js.
   Contains no layout, spacing, flex, grid, sizing, or visual styles. */
(() => {
  'use strict';

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  let context = null;
  let master = null;
  let cycleTimer = 0;
  let alarmStartedAt = 0;
  let running = false;
  let replacingOriginalAlarm = false;
  let phraseIndex = 0;

  function ensureAudio() {
    if (!context || context.state === 'closed') {
      context = new AudioContextClass();
      master = context.createGain();
      master.gain.value = 0.0001;
      master.connect(context.destination);
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
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + 0.018);
    gain.gain.setValueAtTime(Math.max(0.0002, volume), Math.max(start + 0.02, start + duration - 0.055));
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
    const level = 0.12 + progress * 0.46;
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.setTargetAtTime(level, context.currentTime, 0.05);

    const now = context.currentTime + 0.025;
    const variants = [
      [523.25, 659.25, 783.99],
      [587.33, 739.99, 880.00],
      [523.25, 698.46, 830.61],
      [659.25, 783.99, 987.77]
    ];
    const notes = variants[phraseIndex % variants.length];
    const wobble = phraseIndex % 2 === 0 ? 1 : 1.015;

    tone(notes[0] * wobble, now, 0.20, 0.16, 'sine');
    tone(notes[1], now + 0.17, 0.22, 0.15, 'triangle');
    tone(notes[2], now + 0.35, 0.29, 0.14, 'sine', notes[2] * 1.025);
    if (progress > 0.28) tone(notes[0] / 2, now + 0.02, 0.48, 0.055 + progress * 0.035, 'triangle');
    if (phraseIndex % 3 === 2) tone(notes[1] * 1.5, now + 0.68, 0.17, 0.09 + progress * 0.04, 'sine');

    phraseIndex += 1;
    const delays = [980, 1110, 1040, 1190];
    cycleTimer = window.setTimeout(playPhrase, Math.max(760, delays[phraseIndex % delays.length] - progress * 130));
  }

  async function startAlarm(modal) {
    if (running || replacingOriginalAlarm) return;
    replacingOriginalAlarm = true;
    modal.querySelector('#srStop, .sr-stop')?.click();
    await ensureAudio().catch(() => {});
    modal.classList.add('show');
    running = true;
    replacingOriginalAlarm = false;
    phraseIndex = 0;
    alarmStartedAt = performance.now();
    playPhrase();
  }

  function stopAlarm() {
    running = false;
    replacingOriginalAlarm = false;
    clearTimeout(cycleTimer);
    cycleTimer = 0;
    if (context && master) {
      const now = context.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setTargetAtTime(0.0001, now, 0.025);
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
