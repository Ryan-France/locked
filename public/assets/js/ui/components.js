import { icon } from './icons.js';
import { DEVICES } from '../engine/devices.js';
import { AWARDS } from '../engine/awards.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const cvar = (name) => `var(--${name})`;
export const initials = (n) => n.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
export const fmt = (v, d = 0) => v == null ? '–' : Number(v).toLocaleString('en-IE', { maximumFractionDigits: d, minimumFractionDigits: d });
export function fmtDate(d, o = { day: 'numeric', month: 'short' }) { return new Date(d + 'T12:00:00Z').toLocaleDateString('en-IE', { ...o, timeZone: 'UTC' }); }
export function hm(min) { const h = Math.floor(min / 60), m = Math.round(min % 60); return h ? `${h}h ${String(m).padStart(2, '0')}` : `${m} min`; }
export function pace(sPerKm) { const m = Math.floor(sPerKm / 60), s = Math.round(sPerKm % 60); return `${m}:${String(s).padStart(2, '0')}`; }
export function clock(min) { const h = Math.floor(min / 60), m = Math.floor(min % 60), s = Math.round((min * 60) % 60); return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`; }
export function sleepFmt(h) { if (h == null) return '–'; const hh = Math.floor(h), mm = Math.round((h - hh) * 60); return `${hh}:${String(mm).padStart(2, '0')}`; }

// Whoop-style traffic light for recovery
export const recColor = (v) => v == null ? 'var(--faint)' : v >= 67 ? 'var(--good)' : v >= 34 ? 'var(--warn)' : 'var(--bad)';

// ---------- avatar with champion halo ----------
export function avatar(p, { size = '', halo = [], link = true } = {}) {
  const cols = halo.map((a) => cvar(AWARDS[a].color));
  let style = `--h:${p.hue ?? 150}`;
  let cls = 'av ' + size;
  if (cols.length) {
    const g = cols.length === 1 ? cols[0] : `conic-gradient(${cols.map((c, i) => `${c} ${i * 100 / cols.length}% ${(i + 1) * 100 / cols.length}%`).join(',')})`;
    style += `;--halo:${g};--glow:color-mix(in srgb, ${cols[0]} 45%, transparent)`;
    cls += ' halo';
  }
  const title = cols.length ? ` title="Last week: ${halo.map((a) => AWARDS[a].label).join(', ')}"` : '';
  const inner = p.photo ? `<img src="${esc(p.photo)}" alt="">` : esc(initials(p.name));
  return link ? `<a class="${cls}" style="${style}" href="#/u/${p.id}"${title} aria-label="${esc(p.name)}">${inner}</a>`
              : `<span class="${cls}" style="${style}"${title}>${inner}</span>`;
}

export function deviceTag(p) { return `<span class="tag">${icon('watch')}${esc(DEVICES[p.device]?.name || p.device)}</span>`; }
export const manualTag = () => `<button class="tag manual" data-manual title="Includes manual entries">${icon('edit')}Manual</button>`;

// ---------- small charts ----------
export function spark(values, color = 'var(--ink)', { h = 46, fill = true, w = 300 } = {}) {
  const v = values.map((x) => x == null ? null : +x);
  const ok = v.filter((x) => x != null);
  if (ok.length < 2) return `<svg class="spark" viewBox="0 0 ${w} ${h}"></svg>`;
  const lo = Math.min(...ok), hi = Math.max(...ok), span = hi - lo || 1;
  const X = (i) => (i / (v.length - 1)) * w, Y = (x) => h - 3 - ((x - lo) / span) * (h - 8);
  let d = '', started = false, first = 0, last = 0;
  v.forEach((x, i) => { if (x == null) return; d += `${started ? 'L' : 'M'}${X(i).toFixed(1)},${Y(x).toFixed(1)}`; if (!started) first = i; started = true; last = i; });
  const area = fill ? `<path d="${d}L${X(last)},${h}L${X(first)},${h}Z" fill="${color}" opacity=".16"/>` : '';
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">${area}<path d="${d}" fill="none" stroke="${color}" stroke-width="1.7" vector-effect="non-scaling-stroke" stroke-linejoin="round" class="draw"/></svg>`;
}

export function ring(value, max, color, label, display, sub = '') {
  const r = 52, c = 2 * Math.PI * r, f = value == null ? 0 : Math.min(1, value / max);
  return `<div class="ring">
    <svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--chip-2)" stroke-width="8"/>
      <circle class="arc" cx="60" cy="60" r="${r}" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="${'butt'}"
        stroke-dasharray="${c}" stroke-dashoffset="${c}" data-off="${c * (1 - f)}" transform="rotate(-90 60 60)"/>
      <foreignObject x="10" y="34" width="100" height="52"><div xmlns="http://www.w3.org/1999/xhtml" style="text-align:center"><span class="num rv" data-count="${value ?? ''}">${display}</span></div></foreignObject>
    </svg>
    <span class="rl">${label}</span>${sub ? `<span class="sub" style="margin:0">${sub}</span>` : ''}
  </div>`;
}

// Line chart with axis for deep dives. series: [{values:[{x:date,y}], color, area}]
export function lineChart(series, { h = 240, yLabel = '', band = null, bars = false } = {}) {
  const w = 720, pad = { l: 36, r: 10, t: 12, b: 24 };
  const pts = series.flatMap((s) => s.values.filter((p) => p.y != null));
  if (!pts.length) return `<div class="empty">No data in this period yet.</div>`;
  const xs = series[0].values.map((p) => p.x);
  let lo = Math.min(...pts.map((p) => p.y), band ? band[0] : Infinity), hi = Math.max(...pts.map((p) => p.y), band ? band[1] : -Infinity);
  if (bars) lo = Math.min(0, lo);
  const padY = (hi - lo) * 0.08 || 1; lo -= bars ? 0 : padY; hi += padY;
  const X = (i) => pad.l + (i / Math.max(1, xs.length - 1)) * (w - pad.l - pad.r);
  const Y = (y) => pad.t + (1 - (y - lo) / (hi - lo)) * (h - pad.t - pad.b);
  const ticks = 4, grid = [];
  for (let k = 0; k <= ticks; k++) { const y = lo + (hi - lo) * k / ticks; grid.push(`<line x1="${pad.l}" x2="${w - pad.r}" y1="${Y(y)}" y2="${Y(y)}"/><text x="${pad.l - 6}" y="${Y(y) + 3}" text-anchor="end">${Math.round(y)}</text>`); }
  const step = Math.max(1, Math.ceil(xs.length / 6)), xl = [];
  for (let i = 0; i < xs.length; i += step) xl.push(`<text x="${X(i)}" y="${h - 6}" text-anchor="middle">${fmtDate(xs[i])}</text>`);
  const bandEl = band ? `<rect x="${pad.l}" width="${w - pad.l - pad.r}" y="${Y(band[1])}" height="${Y(band[0]) - Y(band[1])}" fill="var(--chip)"/>` : '';
  const paths = series.map((s) => {
    if (bars) {
      const bw = Math.max(1.5, (w - pad.l - pad.r) / xs.length - 2);
      return s.values.map((p, i) => p.y == null ? '' : `<rect x="${X(i) - bw / 2}" y="${Y(Math.max(0, p.y))}" width="${bw}" height="${Math.abs(Y(0) - Y(p.y))}" fill="${p.c || s.color}" opacity="${s.opacity || .9}"/>`).join('');
    }
    let d = '', on = false;
    s.values.forEach((p, i) => { if (p.y == null) { on = s.gaps ? false : on; return; } d += `${on ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.y).toFixed(1)}`; on = true; });
    const dots = s.dots ? s.values.map((p, i) => p.y == null ? '' : `<circle cx="${X(i)}" cy="${Y(p.y)}" r="2.2" fill="${p.c || s.color}"/>`).join('') : '';
    return `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${s.width || 2}" stroke-dasharray="${s.dash || ''}" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>${dots}`;
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="${esc(yLabel)}"><g class="grid">${grid.join('')}</g>${bandEl}${paths}${xl.join('')}</svg>`;
}

// ---------- overlays ----------
export function sheet(html, onMount) {
  const el = document.createElement('div');
  el.className = 'scrim';
  el.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><button class="iconbtn x" data-close aria-label="Close">${icon('x')}</button>${html}</div>`;
  const close = () => { el.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('[data-close]')) close(); });
  document.addEventListener('keydown', onKey);
  document.body.appendChild(el);
  el.querySelector('.sheet').focus?.();
  onMount && onMount(el.querySelector('.sheet'), close);
  return close;
}
export function toast(text) {
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = text;
  document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
}

// Explanations behind every (i)
export const INFO = {
  overall: ['Overall', 'Your recovery, training load and sleep combined into one score out of 100. Load counts slightly more than sleep. It is built only from measurements every device shares, so a Whoop and a Garmin are scored the same way.'],
  recovery: ['Recovery', 'How ready your body is today compared with your own normal: overnight heart-rate variability, resting heart rate and last night\'s sleep. Because it is measured against your own baseline, someone with naturally low HRV can still top the board.'],
  load: ['Training load', 'Training stress from every session, worked out from your heart rate against your own resting and threshold heart rate. An hour at threshold is 100. Lifting gets a small correction because heart rate under-reads it.'],
  sleep: ['Sleep', 'Hours asleep against an eight-hour target, plus how regular your bedtime is across the week.'],
  consistency: ['Consistency', 'Days you trained (15+ training stress) or walked 10,000 steps. Six days out of seven is 100%.'],
  fitness: ['Fitness', 'Your training load averaged over the last six weeks, with recent days counting most. It rises slowly with steady training and falls slowly when you stop.'],
  rhr: ['Resting heart rate', 'Your overnight resting heart rate, adjusted so every brand reads on the same scale. Lower is better.'],
  hrv: ['HRV trend', 'Heart-rate variability can\'t be compared between people, so this board ranks how far above or below your own 30-day normal you are.'],
  steps: ['Steps', 'Average steps a day. People whose devices don\'t send steps are left off this board rather than given zero.'],
  calibration: ['Calibration', 'For the first 14 days Locked learns your normal heart rate, HRV and sleep. Your scores are hidden from boards until then, so they are fair from the first day they show.'],
  manual: ['Manual entry', 'Some of this person\'s data was typed in by hand rather than recorded by a device. It still counts, but treat it with a little caution.'],
  champions: ['Weekly champions', 'Every Sunday at 18:00 each group crowns a recovery, training load, sleep and consistency champion for the week. Winners wear a coloured ring in that group until the next announcement. You need four nights of data to win recovery or sleep.'],
};
export function info(key) { return `<button class="info" data-info="${key}" aria-label="About ${esc(INFO[key]?.[0] || '')}">i</button>`; }

// Count-up numbers and ring arcs, run after every render
export function animate(root) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.querySelectorAll('.arc[data-off]').forEach((a) => requestAnimationFrame(() => requestAnimationFrame(() => { a.style.strokeDashoffset = a.dataset.off; })));
  if (reduce) return;
  root.querySelectorAll('[data-count]').forEach((el) => {
    const end = parseFloat(el.dataset.count); if (!isFinite(end) || el.dataset.done) return;
    const dec = (el.textContent.split('.')[1] || '').replace(/\D/g, '').length;
    const tail = el.textContent.replace(/^[-–\d.,\s]+/, '');
    el.dataset.done = 1; const t0 = performance.now(), dur = 900;
    const step = (t) => { const k = Math.min(1, (t - t0) / dur), e = 1 - (1 - k) ** 3; el.textContent = (end * e).toFixed(dec) + tail; if (k < 1) requestAnimationFrame(step); else el.textContent = end.toFixed(dec) + tail; };
    requestAnimationFrame(step);
  });
}
