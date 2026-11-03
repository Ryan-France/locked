import { S, P, myGroups, scopeMembers, scopeName, scopeHalos } from '../store.js';
import { board, windowFor, METRICS, addDays, weekStart } from '../engine/scoring.js';
import { avatar, esc, fmt, cvar, info, manualTag, sleepFmt } from '../ui/components.js';
import { icon } from '../ui/icons.js';
import { rerender } from '../app.js';

export const UI = { scope: null, win: 'week', metric: 'overall' };
const PRIMARY = ['overall', 'recovery', 'load', 'sleep'];
const SECONDARY = ['consistency', 'fitness', 'rhr', 'hrv', 'steps'];
const WIN_LABEL = { day: 'Today', week: 'This week', month: 'This month' };

export function valueText(metric, v, stats) {
  if (v == null) return '–';
  switch (metric) {
    case 'recovery': case 'consistency': return `${v}<small>%</small>`;
    case 'hrv': return `${v > 0 ? '+' : ''}${v}<small>% vs normal</small>`;
    case 'rhr': return `${v}<small>bpm</small>`;
    case 'steps': return `${fmt(v)}<small>a day</small>`;
    case 'fitness': return `${fmt(v, 1)}<small>CTL</small>`;
    case 'load': return `${v}<small>${stats.hours} h</small>`;
    case 'sleep': return `${v}<small>${sleepFmt(stats.sleepH)} avg</small>`;
    default: return `${v}<small>/ 100</small>`;
  }
}

// rank movement against the same window ending yesterday
function movement(people, metric, from, to) {
  if (from === to) return {};
  const prev = board(people, metric, from, addDays(to, -1));
  return Object.fromEntries(prev.ranked.map((r) => [r.person.id, r.rank]));
}

export function renderBoard({ scope = 'friends', metric = 'overall', win = 'week', podium = true, limit = 0 } = {}) {
  const people = scopeMembers(scope);
  const [from, to] = windowFor(win, S.today);
  const b = board(people, metric, from, to);
  const prev = movement(people, metric, from, to);
  const h = scopeHalos(scope);
  const m = METRICS[metric], color = cvar(m.color);
  const vals = b.ranked.map((r) => r.value);
  const max = Math.max(...vals), min = Math.min(...vals);
  const frac = (v) => m.better === 'low' ? (max === min ? 1 : 0.25 + 0.75 * (max - v) / (max - min)) : (max <= 0 ? 0 : Math.max(0.04, v / max));
  let rows = b.ranked;
  const meIdx = rows.findIndex((r) => r.person.id === S.me.id);
  if (limit && rows.length > limit) rows = meIdx >= limit ? [...rows.slice(0, limit - 1), rows[meIdx]] : rows.slice(0, limit);

  const podiumHtml = podium && b.ranked.length >= 4 ? (() => {
    const [a, c, d] = b.ranked;
    const pod = (r, cls) => `<a class="pod ${cls}" href="#/u/${r.person.id}" style="--c:${color}"><span class="p-rk num">${r.rank}</span>
      ${avatar(r.person, { size: cls === 'first' ? 'lg' : 'md', halo: h[r.person.id] || [], link: false })}
      <span class="p-n">${esc(r.person.first)}</span><span class="p-v num">${valueText(metric, r.value, r.stats).replace(/<small>.*<\/small>/, '')}</span></a>`;
    return `<div class="podium">${pod(c, 'second')}${pod(a, 'first')}${pod(d, 'third')}</div>`;
  })() : '';

  const list = (podiumHtml ? rows.filter((r) => r.rank > 3 || limit) : rows).map((r, i) => {
    const p = r.person, was = prev[p.id];
    const mv = was && was !== r.rank ? (was > r.rank ? `<span class="mv up">▲${was - r.rank}</span>` : `<span class="mv down">▼${r.rank - was}</span>`) : '';
    return `<a class="lb-row ${p.id === S.me.id ? 'me' : ''} ${r.rank <= 3 ? 'top' : ''}" href="#/u/${p.id}" style="--d:${i * 45}ms;--c:${color}">
      <span class="rk num">${r.rank}</span>${avatar(p, { halo: h[p.id] || [], link: false })}
      <span style="min-width:0"><span class="nm"><span>${esc(p.id === S.me.id ? 'You' : p.name)}</span>${r.manual ? manualTag() : ''}${mv}</span>
        <span class="meta">${esc(p.identity || '')}</span><span class="bar"><i style="--w:${(frac(r.value) * 100).toFixed(1)}%;--d:${i * 45 + 150}ms"></i></span></span>
      <span class="xtra"><span>R <b>${r.stats.recovery ?? '–'}</b></span><span>L <b>${r.stats.tss}</b></span><span>S <b>${r.stats.sleepScore ?? '–'}</b></span></span>
      <span class="val num">${valueText(metric, r.value, r.stats)}</span></a>`;
  }).join('');

  const un = b.unranked.map((r) => {
    const p = r.person, why = r.calibrating
      ? `Calibrating, day ${p.series.calibration.day} of 14`
      : metric === 'steps' ? 'No step data from this device' : `Not enough data ${WIN_LABEL[win].toLowerCase()}`;
    return `<a class="lb-row cal" href="#/u/${p.id}"><span class="rk num">–</span>${avatar(p, { link: false })}
      <span style="min-width:0"><span class="nm"><span>${esc(p.id === S.me.id ? 'You' : p.name)}</span></span><span class="meta">${why}</span></span><span class="xtra"></span>
      <span class="val num">${r.calibrating ? icon('lock', 'vh-no') : '–'}</span></a>`;
  }).join('');
  return `${podiumHtml}<div class="lb">${list}${limit ? '' : un}</div>`;
}

export function view(metricParam) {
  if (metricParam && METRICS[metricParam]) UI.metric = metricParam;
  const groups = myGroups();
  const scope = UI.scope || 'friends';
  const m = METRICS[UI.metric];
  const chip = (k, cls = '') => `<button class="chip ${cls}" data-metric="${k}" aria-pressed="${UI.metric === k}" style="--c:${cvar(METRICS[k].color)}"><span class="sw"></span>${METRICS[k].label}</button>`;
  const html = `
    <div class="chips" role="group" aria-label="Who">${['friends', ...groups.map((g) => g.id)].map((id) => `<button class="chip" data-scope="${id}" aria-pressed="${scope === id}">${esc(scopeName(id))}</button>`).join('')}</div>
    <div class="row between mt" style="flex-wrap:wrap">
      <div class="seg" role="group" aria-label="When">${Object.entries(WIN_LABEL).map(([k, l]) => `<button data-win="${k}" aria-pressed="${UI.win === k}">${l}</button>`).join('')}</div>
      <div class="row" style="gap:6px"><a class="btn ghost sm" href="#/h2h">${icon('vs')}Head-to-head</a><a class="btn ghost sm" href="#/records">${icon('medal')}Records</a></div>
    </div>
    <div class="chips mt" role="group" aria-label="Board">${PRIMARY.map((k) => chip(k)).join('')}</div>
    <div class="chips" style="margin-top:6px" role="group" aria-label="More boards">${SECONDARY.map((k) => chip(k)).join('')}</div>
    <h2 class="sec"><span>${m.label} · ${WIN_LABEL[UI.win]}</span>${info(UI.metric === 'load' ? 'load' : UI.metric)}</h2>
    ${m.kind === 'personal' ? `<p class="sub" style="margin:-6px 0 12px">Ranked against each person's own normal, so different bodies compete fairly.</p>` : ''}
    ${renderBoard({ scope, metric: UI.metric, win: UI.win })}
  `;
  return {
    title: 'Boards', html,
    mount(root) {
      root.addEventListener('click', (e) => {
        const s = e.target.closest('[data-scope]'), w = e.target.closest('[data-win]'), k = e.target.closest('[data-metric]');
        if (s) UI.scope = s.dataset.scope; else if (w) UI.win = w.dataset.win; else if (k) UI.metric = k.dataset.metric; else return;
        if (k && location.hash !== '#/boards') { location.hash = '#/boards'; return; }
        rerender();
      });
    },
  };
}
