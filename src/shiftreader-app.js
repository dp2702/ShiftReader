'use strict';

const $ = (id) => document.getElementById(id);
const S = {
  img: null,
  name: 'timetable',
  rows: [],
  cancel: false,
  log: [],
  favorites: new Set(JSON.parse(localStorage.getItem('srFavorites') || '[]'))
};

const D = {
  Short: '#22c55e',
  Meal: '#f59e0b',
  WB20: '#60a5fa',
  WB70: '#a78bfa'
};

function say(text, kind = '') {
  const status = $('status');
  if (!status) return;
  status.textContent = text;
  status.className = 'status ' + kind;
}

function log(message) {
  S.log.push(message);
  const diag = $('diag');
  if (diag) diag.textContent = S.log.join('\n');
}

function med(values) {
  const xs = [...values].sort((a, b) => a - b);
  if (!xs.length) return 0;
  const mid = Math.floor(xs.length / 2);
  return xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
}

function hsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const M = Math.max(r, g, b);
  const m = Math.min(r, g, b);
  const d = M - m;
  let h = 0;

  if (d) {
    h = M === r ? ((g - b) / d) % 6 : M === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  return [h, M ? d / M : 0, M];
}

function detect(img) {
  const ctx = img.getContext('2d', { willReadFrequently: true });
  const w = img.width;
  const h = img.height;
  const data = ctx.getImageData(0, 0, w, h).data;
  const st = 3;
  const gw = Math.ceil(w / st);
  const gh = Math.ceil(h / st);
  const map = new Uint8Array(gw * gh);
  const types = [];

  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      const i = (y * gw + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const H = hsv(r, g, b)[0];
      let kind = 'bg';
      if (H >= 20 && H <= 60 && (r > g && g > b * 0.7) && (r > 80)) kind = 'yellow';
      if (H >= 100 && H <= 155 && g > 80 && b < g && r < g) kind = 'green';
      if (H >= 150 && H <= 220 && b > 80 && g < b && r < b) kind = 'blue';
      if (H >= 0 && H <= 25 && r > 120 && g < r * 0.75 && b < r * 0.75) kind = 'red';
      map[y * gw + x] = kind === 'bg' ? 0 : 1;
    }
  }

  const toBox = (x, y) => ({ x: x * st, y: y * st, w: st, h: st });
  const boxes = [];
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      if (!map[y * gw + x]) continue;
      let x1 = x;
      while (x1 + 1 < gw && map[y * gw + x1 + 1]) x1++;
      let y1 = y;
      while (y1 + 1 < gh && Array.from({ length: x1 - x + 1 }, (_, dx) => map[y1 * gw + x + dx]).every(Boolean)) y1++;
      boxes.push({ ...toBox(x, y), x2: x1, y2: y1 });
      for (let yy = y; yy <= y1; yy++) {
        for (let xx = x; xx <= x1; xx++) map[yy * gw + xx] = 0;
      }
      x = x1;
    }
  }

  return boxes.map((box) => ({
    x: box.x,
    y: box.y,
    w: box.x2 * st - box.x + st,
    h: box.y2 * st - box.y + st,
    area: (box.x2 * st - box.x + st) * (box.y2 * st - box.y + st)
  }));
}

function group(blocks, h) {
  const ys = blocks.map((b) => b.y + b.h / 2).sort((a, b) => a - b);
  const gaps = ys.slice(1).map((v, i) => v - ys[i]).filter((x) => x > 3);
  const gap = med(gaps.filter((x) => x > med(gaps) * 0.45)) || h * 0.03;
  const rows = [];
  for (const block of [...blocks].sort((a, b) => a.y - b.y)) {
    let row = rows.find((r) => Math.abs(block.y - r.y) <= gap * 1.4);
    if (!row) {
      row = { y: block.y, items: [] };
      rows.push(row);
    }
    row.items.push(block);
  }
  return rows;
}

function crop(src, x, y, w, h, s = 3) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * s));
  canvas.height = Math.max(1, Math.round(h * s));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(src, x, y, w, h, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function grids(src, blocks, ppm) {
  const ctx = src.getContext('2d', { willReadFrequently: true });
  const w = src.width;
  const h = src.height;
  const data = ctx.getImageData(0, 0, w, h).data;
  const y0 = Math.max(0, Math.min(...blocks.map((b) => b.y)) - 3);
  const y1 = Math.min(h, Math.max(...blocks.map((b) => b.y + b.h)) + 3);
  const xs = blocks.map((b) => b.x + b.w / 2).sort((a, b) => a - b);
  const x0 = Math.max(0, xs[0] - 20);
  const x1v = Math.min(w, xs[xs.length - 1] + 20);
  const rows = [];

  for (let yy = y0; yy < y1; yy++) {
    const px = [];
    for (let xx = x0; xx < x1v; xx++) {
      const i = (yy * w + xx) * 4;
      const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
      if (gray > 180) px.push(xx);
    }
    if (px.length > 8) rows.push({ y: yy, x: px[0], w: px[px.length - 1] - px[0] + 1 });
  }

  return rows.filter((r) => r.w > 10).map((r) => ({
    ...r,
    yM: r.y + r.w / (ppm || 1)
  }));
}

function one(value) {
  const text = String(value).replace(/[Oo]/g, '0').replace(/[Il|]/g, '1');
  const match = text.match(/([0-2]?\d)\s*[:.]\s*([0-5]\d)/);
  if (match) return Number(match[1]) * 60 + Number(match[2]);
  const compact = text.match(/\b([0-2]\d)([0-5]\d)\b/);
  return compact ? Number(compact[1]) * 60 + Number(compact[2]) : null;
}

async function run() {
  if (!S.img) return;
  S.cancel = false;
  S.log = [];
  const readBtn = $('read');
  const cancelBtn = $('cancel');
  if (readBtn) readBtn.disabled = true;
  if (cancelBtn) cancelBtn.disabled = false;

  try {
    let width = Math.min(2400, S.img.width);
    let height = Math.round((S.img.height * width) / S.img.width);
    const source = document.createElement('canvas');
    source.width = width;
    source.height = height;
    const ctx = source.getContext('2d');
    ctx.drawImage(S.img, 0, 0, source.width, source.height);

    const results = detect(source);
    const rows = group(results, source.height);
    say('Detected schedule blocks', 'ok');
    log('Block count: ' + results.length);
    log('Rows detected: ' + rows.length);

    const output = {
      width,
      height,
      rows,
      blocks: results
    };

    const result = document.getElementById('result');
    if (result) {
      result.textContent = JSON.stringify(output, null, 2);
    }
  } catch (error) {
    say('Processing failed', 'bad');
    log(error.message || String(error));
    console.error(error);
  } finally {
    if (readBtn) readBtn.disabled = false;
    if (cancelBtn) cancelBtn.disabled = true;
  }
}

function draw(src, rows, gridsMap) {
  const canvas = $('debug');
  if (!canvas) return;
  canvas.width = src.width;
  canvas.height = src.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(src, 0, 0);
  ctx.lineWidth = 2;
  for (const row of rows) {
    for (const block of row.items || []) {
      ctx.strokeStyle = D[Object.keys(D)[(row.items.indexOf(block) + row.y) % Object.keys(D).length]] || '#ffffff';
      ctx.strokeRect(block.x, block.y, block.w, block.h);
    }
  }
  for (const line of gridsMap || []) {
    ctx.strokeStyle = '#00ff88';
    ctx.strokeRect(line.x, line.y, line.w, 2);
  }
}

window.ShiftReaderApp = {
  run,
  draw,
  detect,
  group,
  crop,
  grids,
  one,
  say,
  log
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const readBtn = $('read');
    if (readBtn) readBtn.addEventListener('click', run);
  });
} else {
  const readBtn = $('read');
  if (readBtn) readBtn.addEventListener('click', run);
}
