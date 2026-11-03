import { S, P, circle, save, nowStamp } from '../store.js';
import { addDays } from '../engine/scoring.js';
import { avatar, esc, fmt, fmtDate, hm, pace, deviceTag, manualTag, toast } from '../ui/components.js';
import { icon, SPORT_ICON, SPORT_NAME } from '../ui/icons.js';

export function kudosOf(id) {
  const base = S.data.feed[id]?.kudos || [];
  const mine = S.local.kudos[id];
  const set = new Set(base);
  if (mine === true) set.add(S.me.id); if (mine === false) set.delete(S.me.id);
  return [...set];
}
export function commentsOf(id) { return [...(S.data.feed[id]?.comments || []), ...(S.local.comments[id] || [])]; }

export function statsLine(a) {
  const out = [['Time', hm(a.minutes)]];
  if (a.km) out.push(['Distance', fmt(a.km, a.km < 10 ? 2 : 1) + ' km']);
  if (a.km && a.sport === 'run') out.push(['Pace', pace(a.minutes * 60 / a.km) + ' /km']);
  if (a.km && a.sport === 'bike') out.push(['Speed', fmt(a.km / (a.minutes / 60), 1) + ' km/h']);
  if (a.km && a.sport === 'swim') out.push(['Pace', pace(a.minutes * 60 / (a.km * 10)) + ' /100m']);
  if (a.avg_hr) out.push(['Avg HR', a.avg_hr + ' bpm']);
  out.push(['Stress', a.stress]);
  return `<div class="stats">${out.map(([k, v]) => `<div><span class="lbl">${k}</span><span class="num">${v}</span></div>`).join('')}</div>`;
}
export function zoneBar(a) {
  const z = [1, 2, 3, 4, 5].map((i) => a[`z${i}_min`] || 0), t = z.reduce((s, v) => s + v, 0);
  if (!t) return '';
  return `<div class="zbar" title="Time in heart-rate zones">${z.map((v, i) => v ? `<i style="width:${v / t * 100}%;background:var(--z${i + 1})"></i>` : '').join('')}</div>`;
}

export function post(p, a, { full = false } = {}) {
  const k = kudosOf(a.id), mine = k.includes(S.me.id), cm = commentsOf(a.id);
  const when = a.date === S.today ? 'Today' : a.date === addDays(S.today, -1) ? 'Yesterday' : fmtDate(a.date, { weekday: 'short', day: 'numeric', month: 'short' });
  const sets = a.sets ? `<p class="sub">${a.sets.length} × ${a.sets[0].reps} ${esc(a.sets[0].lift)} at ${a.sets[0].kg} kg</p>` : '';
  return `<article class="card post" data-act="${a.id}">
    <div class="post-h">${avatar(p, { size: 'md' })}<div class="grow"><a href="#/u/${p.id}" style="font-weight:600">${esc(p.id === S.me.id ? 'You' : p.name)}</a>
      <div class="s muted" style="font-size:12.5px">${when}${a.time ? ' at ' + a.time : ''}</div></div>
      <span class="tag">${icon(SPORT_ICON[a.sport] || 'pulse')}${SPORT_NAME[a.sport] || 'Workout'}</span>${a.manual ? manualTag() : ''}</div>
    <a href="#/u/${p.id}/a/${a.id}"><h3 class="post-t">${esc(a.name)}</h3></a>
    ${statsLine(a)}${sets}${zoneBar(a)}
    <div class="post-f">
      <button class="kudo" data-kudo="${a.id}" aria-pressed="${mine}">${icon('flame')}<span>${k.length || ''}</span><span class="vh">Kudos</span></button>
      <span class="muted" style="font-size:12.5px">${k.length ? k.slice(0, 3).map((id) => esc(id === S.me.id ? 'You' : P(id)?.first)).join(', ') + (k.length > 3 ? ` and ${k.length - 3} more` : '') : 'Be the first to give kudos'}</span>
    </div>
    <div class="cmts">${(full ? cm : cm.slice(-2)).map((c) => `<div class="cmt">${avatar(P(c.from), { size: 'xs' })}<p><b>${esc(c.from === S.me.id ? 'You' : P(c.from).first)}</b>${esc(c.text)}</p></div>`).join('')}</div>
    <form class="cform" data-comment="${a.id}"><input class="input" name="t" placeholder="Add a comment" aria-label="Comment" autocomplete="off" maxlength="280"><button class="btn ghost sm" type="submit">Post</button></form>
  </article>`;
}

export function bindPosts(root) {
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-kudo]'); if (!b) return;
    const id = b.dataset.kudo, on = b.getAttribute('aria-pressed') !== 'true';
    S.local.kudos[id] = on; save();
    b.setAttribute('aria-pressed', on);
    const n = kudosOf(id).length; b.querySelector('span').textContent = n || '';
  });
  root.addEventListener('submit', (e) => {
    const f = e.target.closest('[data-comment]'); if (!f) return;
    e.preventDefault();
    const t = f.t.value.trim(); if (!t) return;
    const id = f.dataset.comment;
    (S.local.comments[id] ||= []).push({ from: S.me.id, text: t, at: nowStamp() }); save();
    f.previousElementSibling.insertAdjacentHTML('beforeend', `<div class="cmt">${avatar(S.me, { size: 'xs' })}<p><b>You</b>${esc(t)}</p></div>`);
    f.reset(); toast('Comment posted');
  });
}

export function view() {
  const items = circle().flatMap((p) => p.activities.filter((a) => a.date >= addDays(S.today, -13)).map((a) => ({ p, a })))
    .sort((x, y) => (y.a.date + (y.a.time || '')).localeCompare(x.a.date + (x.a.time || '')));
  const html = `<p class="sub" style="margin:0 0 14px">Workouts from you and your friends over the last two weeks.</p>
    <div class="stack">${items.slice(0, 40).map(({ p, a }) => post(p, a)).join('') || '<div class="empty">No workouts yet. Add friends to fill your feed.<br><a class="btn" href="#/friends">Find friends</a></div>'}</div>`;
  return { title: 'Feed', html, mount: bindPosts };
}
