import { S, P, circle, save, rebuild, resetLocal, myGroups, friendIds, scopeHalos } from '../store.js';
import { earnedBadges, BADGES } from '../engine/awards.js';
import { strengthSummary } from '../engine/strength.js';
import { addDays } from '../engine/scoring.js';
import { DEVICES } from '../engine/devices.js';
import { avatar, esc, fmt, fmtDate, toast, sheet, clock, pace, info, manualTag } from '../ui/components.js';
import { icon, SPORT_NAME } from '../ui/icons.js';
import { applyTheme, rerender, query } from '../app.js';

// ---------- medals ----------
const TIER = { gold: ['#e8b33a', '#8a6410'], silver: ['#c9ced6', '#6b7480'], bronze: ['#d08a52', '#7a4520'] };
const BADGE_ICON = { 'sleep-demon': 'moon', 'iron-week': 'dumbbell', 'green-week': 'gauge', century: 'bolt', 'big-week': 'flame', 'streak-30': 'repeat', 'bounce-back': 'pulse', marathoner: 'run', 'early-nights': 'moon', 'step-up': 'steps' };
export function medal(b, earned = true) {
  const [c, d] = TIER[b.tier];
  return `<svg class="medal" viewBox="0 0 64 64" aria-hidden="true"><path d="M20 4h10l4 14H24ZM44 4H34l-4 14h10Z" fill="${d}"/>
    <circle cx="32" cy="38" r="21" fill="${d}"/><circle cx="32" cy="38" r="17.5" fill="${c}"/><circle cx="32" cy="38" r="17.5" fill="none" stroke="${d}" stroke-width="1" stroke-dasharray="2 2.4" opacity=".6"/>
    <g transform="translate(22 28) scale(.84)" style="color:${d}">${icon(BADGE_ICON[b.id] || 'trophy').replace('<svg class=""', '<svg width="24" height="24"')}</g></svg>`;
}
export function badges() {
  const p = P(query.get('u')) || S.me;
  const got = earnedBadges(p.series);
  return {
    title: p.id === S.me.id ? 'Badges' : `${p.first}'s badges`, back: `#/u/${p.id}`,
    html: `<p class="sub" style="margin:0 0 14px">${Object.keys(got).length} of ${BADGES.length} earned. Badges are for good habits, so everyone can earn every one, whatever their sport.</p>
      <div class="badges">${BADGES.map((b) => `<div class="card badge ${got[b.id] ? '' : 'locked'}">${medal(b)}<span class="bn">${esc(b.name)}</span><span class="bd">${esc(b.desc)}</span>${got[b.id] ? `<span class="tag">${fmtDate(got[b.id], { day: 'numeric', month: 'short', year: 'numeric' })}</span>` : '<span class="tag">Not yet</span>'}</div>`).join('')}</div>`,
  };
}

// ---------- records ----------
const DISTS = [['5 km', 5], ['10 km', 10], ['Half', 21.0975], ['Marathon', 42.195]];
export function runBests(p) {
  const runs = p.activities.filter((a) => a.sport === 'run' && a.km && a.minutes && a.minutes / a.km >= 2.6); // faster than 2:36/km is a GPS glitch
  return DISTS.map(([label, d]) => {
    const ok = runs.filter((a) => a.km >= 0.98 * d); if (!ok.length) return null;
    const best = ok.reduce((b, a) => (a.minutes / a.km < b.minutes / b.km ? a : b));
    const pc = best.minutes / best.km;
    return { label, d, pace: pc, time: clock(pc * d), date: best.date, manual: !!best.manual };
  }).filter(Boolean);
}
export function strengthBoard(people, scope = 'friends') {
  const h = scopeHalos(scope);
  const rows = people.filter((p) => p.bodyweight).map((p) => ({ p, s: strengthSummary(p.activities, p.bodyweight, addDays(S.today, -90)) })).filter((r) => r.s.n).sort((a, b) => b.s.dots - a.s.dots);
  if (!rows.length) return `<div class="empty card">Nobody here has logged squat, bench or deadlift sets yet. Log them from Hevy, Strong or Garmin strength workouts.</div>`;
  return `<div class="lb">${rows.map((r, i) => `<a class="lb-row ${r.p.id === S.me.id ? 'me' : ''}" href="#/u/${r.p.id}" style="--d:${i * 45}ms;--c:var(--violet)"><span class="rk num">${i + 1}</span>${avatar(r.p, { halo: h[r.p.id] || [], link: false })}
    <span style="min-width:0"><span class="nm"><span>${esc(r.p.id === S.me.id ? 'You' : r.p.name)}</span></span><span class="meta">${Object.entries(r.s.lifts).map(([k, v]) => `${k} ${fmt(v, 0)}`).join(' · ')}${r.s.n < 3 ? ` · ${r.s.n} of 3 lifts` : ''}</span>
    <span class="bar"><i style="--w:${(r.s.dots / rows[0].s.dots * 100).toFixed(1)}%"></i></span></span><span class="xtra"></span><span class="val num">${fmt(r.s.dots, 1)}<small>DOTS</small></span></a>`).join('')}</div>
    <p class="sub mt">DOTS scores estimated one-rep maxes from the last 90 days against body weight, so lifters of any size compare fairly. Best sets of 10 reps or fewer count.</p>`;
}
export function records() {
  const ppl = circle();
  const runTable = DISTS.map(([label]) => {
    const rows = ppl.map((p) => ({ p, b: runBests(p).find((x) => x.label === label) })).filter((r) => r.b).sort((a, b) => a.b.pace - b.b.pace);
    return `<div class="card c6 wide"><div class="card-h"><span class="ic" style="--c:var(--load)">${icon('run')}</span><span class="t">${label}</span><span class="k">Record holder</span></div>
      ${rows.length ? `<div class="list">${rows.map((r, i) => `<a class="li" href="#/u/${r.p.id}"><span class="num" style="width:20px;color:${i ? 'var(--faint)' : 'var(--load)'}">${i + 1}</span>${avatar(r.p, { size: 'sm', link: false })}<span class="grow"><span class="ttl">${esc(r.p.id === S.me.id ? 'You' : r.p.first)} ${r.b.manual ? manualTag() : ''}</span><span class="s">${pace(r.b.pace * 60)} /km · ${fmtDate(r.b.date, { day: 'numeric', month: 'short', year: 'numeric' })}</span></span><span class="num">${r.b.time}</span></a>`).join('')}</div>` : '<p class="muted">No one has run this far yet.</p>'}</div>`;
  }).join('');
  const rides = ppl.flatMap((p) => p.activities.filter((a) => a.sport === 'bike' && a.km).map((a) => ({ p, a }))).sort((x, y) => y.a.km - x.a.km).slice(0, 5);
  return {
    title: 'Records', back: '#/boards',
    html: `<p class="sub" style="margin:0 0 6px">Best whole-run average pace for each distance, from runs at least that long.</p>
      <div class="grid">${runTable}</div>
      <h2 class="sec"><span>Strength</span><span class="sub" style="margin:0">Balanced for body weight</span></h2>${strengthBoard(ppl)}
      <h2 class="sec"><span>Longest rides</span></h2><div class="card"><div class="list">${rides.map(({ p, a }) => `<a class="li" href="#/u/${p.id}/a/${a.id}">${avatar(p, { size: 'sm', link: false })}<span class="grow"><span class="ttl">${esc(p.id === S.me.id ? 'You' : p.first)} · ${esc(a.name)}</span><span class="s">${fmtDate(a.date, { day: 'numeric', month: 'short', year: 'numeric' })}</span></span><span class="num">${fmt(a.km, 1)} km</span></a>`).join('')}</div></div>`,
  };
}

// ---------- devices ----------
const BRANDS = [
  ['garmin', 'Garmin', 'Activities, heart rate, HRV, sleep, steps'], ['whoop', 'Whoop', 'Recovery inputs, sleep, workouts'], ['coros', 'Coros', 'Activities, heart rate, sleep'],
  ['fitbit', 'Fitbit', 'Heart rate, HRV, sleep, steps'], ['oura', 'Oura', 'HRV, resting HR, sleep, steps'], ['apple', 'Apple Watch', 'Needs the iPhone app (coming later)'],
  ['polar', 'Polar', 'Activities, heart rate, sleep'], ['suunto', 'Suunto', 'Activities, heart rate'],
];
export function connect() {
  const mine = S.me.device;
  return {
    title: 'Devices', back: `#/u/${S.me.id}`,
    html: `<p class="sub" style="margin:0 0 14px">Locked reads the raw measurements every device shares and puts them on one scale, so it doesn't matter which brand you or your friends wear.</p>
      <div class="card"><div class="list">${BRANDS.map(([k, n, what]) => `<div class="li"><span class="iconbtn" style="pointer-events:none">${icon('watch')}</span><span class="grow"><span class="ttl">${n}</span><span class="s">${what}</span></span>
        ${k === mine ? `<span class="tag" style="color:var(--good)">${icon('check')}Connected</span>` : `<button class="btn ghost sm" data-conn="${k}">Connect</button>`}</div>`).join('')}</div></div>
      <div class="card mt row" style="gap:14px"><span class="iconbtn" style="pointer-events:none">${icon('edit')}</span><div style="flex:1"><b>No device?</b><p class="sub" style="margin:2px 0 0">Log workouts by hand. They count, with a manual badge so friends know.</p></div><a class="btn ghost sm" href="#/log">Log workout</a></div>
      <p class="sub mt">Wear two devices? Connect both. Nights recorded on two devices teach Locked how each brand reads, which makes everyone's scores fairer.</p>`,
    mount(root) {
      root.addEventListener('click', (e) => {
        const b = e.target.closest('[data-conn]'); if (!b) return;
        const k = b.dataset.conn, n = DEVICES[k].name;
        sheet(`<h3>Connect ${n}</h3><p>Locked will read from ${n}:</p><ul style="margin:0 0 14px 18px;list-style:disc;color:var(--muted);font-size:14px"><li>Workouts with heart rate</li><li>Overnight heart rate and HRV</li><li>Sleep and steps</li></ul>
          <p>This is health data. It's used only to work out your scores, shared only as your privacy settings allow, and you can disconnect and delete it at any time.</p>
          <label class="row" style="gap:10px;margin:14px 0;font-size:14px;align-items:flex-start"><input type="checkbox" id="ok" style="margin-top:3px"> I agree to Locked processing my health data from ${n} to calculate and share my scores.</label>
          <button class="btn block" id="go" disabled>Continue to ${n}</button>`, (el, close) => {
          const ok = el.querySelector('#ok'), go = el.querySelector('#go');
          ok.addEventListener('change', () => { go.disabled = !ok.checked; });
          go.addEventListener('click', () => { close(); toast(`${n} connections open with the beta. This preview runs on demo data.`); });
        });
      });
    },
  };
}

export function logWorkout() {
  const sports = ['run', 'bike', 'swim', 'strength', 'climb', 'walk', 'other'];
  return {
    title: 'Log workout', back: `#/u/${S.me.id}`,
    html: `<form class="card" id="lw" style="max-width:620px">
      <p class="sub" style="margin:0 0 14px">Manual workouts count towards your boards and are marked with a manual badge.</p>
      <label class="field"><span>Sport</span><select class="select" name="sport">${sports.map((s) => `<option value="${s}">${SPORT_NAME[s]}</option>`).join('')}</select></label>
      <label class="field"><span>Name</span><input class="input" name="name" placeholder="Lunchtime run" maxlength="60"></label>
      <div class="grid"><label class="field c6"><span>Date</span><input class="input" type="date" name="date" value="${S.today}" max="${S.today}" required></label>
        <label class="field c6"><span>Duration (minutes)</span><input class="input" type="number" name="minutes" min="5" max="900" required value="45"></label>
        <label class="field c6"><span>Distance (km)</span><input class="input" type="number" name="km" min="0" step="0.01"></label>
        <label class="field c6"><span>Average heart rate</span><input class="input" type="number" name="hr" min="60" max="220" placeholder="Optional"><small>Without it, stress is estimated from time.</small></label></div>
      <fieldset class="field" id="lifts" hidden style="border:0;padding:0;margin:0 0 16px"><span>Heaviest set (for the strength board)</span>
        <div class="grid"><select class="select c4" name="lift"><option value="">No big lift</option><option value="squat">Squat</option><option value="bench">Bench</option><option value="deadlift">Deadlift</option></select>
        <input class="input c4" type="number" name="kg" placeholder="kg" min="1" step="0.5" aria-label="Weight in kg"><input class="input c4" type="number" name="reps" placeholder="reps" min="1" max="10" aria-label="Reps"></div></fieldset>
      <button class="btn">Save workout</button></form>`,
    mount(root) {
      const f = root.querySelector('#lw');
      f.sport.addEventListener('change', () => { root.querySelector('#lifts').hidden = f.sport.value !== 'strength'; });
      f.addEventListener('submit', (e) => {
        e.preventDefault();
        const a = { id: 'm' + Date.now().toString(36), date: f.date.value, time: new Date().toTimeString().slice(0, 5), sport: f.sport.value, type: f.sport.value,
          name: f.name.value.trim() || SPORT_NAME[f.sport.value], minutes: +f.minutes.value, km: f.km.value ? +f.km.value : null, avg_hr: f.hr.value ? +f.hr.value : null, max_hr: null, manual: true };
        if (a.sport === 'strength' && f.lift.value && f.kg.value && f.reps.value) a.sets = [{ lift: f.lift.value, kg: +f.kg.value, reps: +f.reps.value }];
        S.local.manual.push(a); S.me.activities.push(a); save(); rebuild([S.me.id]);
        toast('Workout saved'); location.hash = `#/u/${S.me.id}/a/${a.id}`;
      });
    },
  };
}

// ---------- settings ----------
const THEMES = [
  ['grit', 'Grit', 'Black and white, grain, big type', ['#0b0b0b', '#ecebe8', '#1e6b46'], "'Archivo'"],
  ['minimal', 'Minimal', 'Clean and calm', ['#000', '#f5f6f7', '#4fcf8e'], "'Inter'"],
  ['playful', 'Playful', 'Rounded and bright', ['#211d2d', '#fbf7ff', '#63e09e'], "'Bricolage Grotesque'"],
  ['sporty', 'Sporty', 'Condensed italics, hard edges', ['#141414', '#fff', '#3fe08a'], "'Barlow Condensed'"],
  ['nerdy', 'Data-dense', 'More numbers per screen', ['#13171b', '#dfe7ec', '#56c48c'], "'IBM Plex Mono'"],
];
const NOTIFY = [['champions', 'Weekly champions', 'Sunday 18:00 results in your groups'], ['overtaken', 'Overtaken', 'When a friend passes you on a board'], ['h2h', 'Head-to-head', 'Invites, lead changes and results'],
  ['requests', 'Friend requests', ''], ['chat', 'Group chat', 'Mentions and new messages'], ['morning', 'Morning recovery', 'Your recovery score when you wake'], ['nudges', 'Nudges', 'A reminder when a streak is at risk']];
const PRIV = [['workouts', 'Workouts'], ['recovery', 'Recovery'], ['hrv', 'HRV'], ['rhr', 'Resting heart rate'], ['sleep', 'Sleep'], ['load', 'Training load'], ['steps', 'Steps']];
const tgl = (name, on) => `<label class="tgl"><input type="checkbox" data-n="${name}" ${on ? 'checked' : ''}><span></span></label>`;

export function settings() {
  const s = S.settings;
  const html = `
    <h2 class="sec" style="margin-top:0"><span>Appearance</span></h2>
    <div class="card"><div class="themes">${THEMES.map(([k, n, d, [bg, ink, ac], font]) => `<button class="th" data-theme-pick="${k}" aria-pressed="${s.theme === k}">
      <span class="pv" style="background:${bg};color:${ink}"><span style="font-family:${font};font-weight:800;font-size:22px;line-height:1;${k === 'grit' || k === 'sporty' ? 'text-transform:uppercase;' : ''}${k === 'sporty' ? 'font-style:italic;' : ''}">Locked</span><span style="height:6px;width:60%;background:${ac};border-radius:${k === 'playful' || k === 'minimal' ? 6 : 0}px"></span></span>
      <span class="pn">${n}</span><span class="pd">${d}</span></button>`).join('')}</div>
      <div class="row between mt"><span>Mode</span><div class="seg">${[['dark', 'Dark'], ['light', 'Light'], ['system', 'System']].map(([k, l]) => `<button data-mode-pick="${k}" aria-pressed="${s.mode === k}">${l}</button>`).join('')}</div></div></div>

    <h2 class="sec" id="notify"><span>Notifications</span></h2>
    <div class="card"><div class="list">${NOTIFY.map(([k, n, d]) => `<div class="li"><span class="grow"><span class="ttl">${n}</span>${d ? `<span class="s">${d}</span>` : ''}</span>${tgl('notify.' + k, s.notify[k])}</div>`).join('')}</div></div>

    <h2 class="sec"><span>Privacy</span></h2>
    <div class="card"><p class="sub" style="margin:0 0 6px">Your scores always show on boards in groups you join. These control who sees the detail behind them.</p>
      <div class="list">${PRIV.map(([k, n]) => `<div class="li"><span class="grow"><span class="ttl">${n}</span></span><select class="select" data-priv="${k}" style="width:auto;height:34px">${[['friends', 'Friends'], ['me', 'Only me']].map(([v, l]) => `<option value="${v}" ${s.privacy[k] === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>`).join('')}</div></div>

    <h2 class="sec"><span>Profile</span></h2>
    <div class="card"><div class="list">
      <div class="li"><span class="grow"><span class="ttl">Show goal countdown</span><span class="s">${S.me.goalOptional ? esc(S.me.goalOptional.name) + ', ' + fmtDate(S.me.goalOptional.date, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Add a race or event to count down to'}</span></span>${tgl('showGoal', s.showGoal)}</div>
      <div class="li"><span class="grow"><span class="ttl">Home board</span><span class="s">The group shown on your home screen</span></span><select class="select" id="homeb" style="width:auto;height:34px">${myGroups().map((g) => `<option value="${g.id}" ${s.homeBoard === g.id ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select></div>
      <a class="li" href="#/connect"><span class="grow"><span class="ttl">Devices</span><span class="s">${esc(DEVICES[S.me.device].name)} connected</span></span>${icon('next')}</a>
      <a class="li" href="#/how"><span class="grow"><span class="ttl">How scores work</span></span>${icon('next')}</a>
    </div></div>

    <h2 class="sec"><span>Your data</span></h2>
    <div class="card"><div class="list">
      <div class="li"><span class="grow"><span class="ttl">Download my data</span><span class="s">Everything Locked holds about you, as a JSON file</span></span><button class="btn ghost sm" id="exp">Download</button></div>
      <div class="li"><span class="grow"><span class="ttl">Reset this preview</span><span class="s">Clears messages, kudos and settings saved on this device</span></span><button class="btn ghost sm" id="rst">Reset</button></div>
      <div class="li"><span class="grow"><span class="ttl">Delete account</span><span class="s">Removes your profile, scores and device connections</span></span><button class="btn ghost sm" id="del" style="color:var(--bad)">Delete</button></div>
    </div></div>
    <p class="sub mt2" style="text-align:center">Locked preview · ${esc(S.data.meta.today)}</p>`;
  return {
    title: 'Settings', back: `#/u/${S.me.id}`, html, actions: '',
    mount(root) {
      root.addEventListener('click', (e) => {
        const t = e.target.closest('[data-theme-pick]'), m = e.target.closest('[data-mode-pick]');
        if (t) { s.theme = t.dataset.themePick; save(); applyTheme(); rerender(); }
        if (m) { s.mode = m.dataset.modePick; save(); applyTheme(); rerender(); }
      });
      root.addEventListener('change', (e) => {
        const n = e.target.dataset.n, p = e.target.dataset.priv;
        if (n) { const [a, b] = n.split('.'); if (b) s[a][b] = e.target.checked; else s[a] = e.target.checked; save(); toast('Saved'); }
        if (p) { s.privacy[p] = e.target.value; save(); toast('Saved'); }
        if (e.target.id === 'homeb') { s.homeBoard = e.target.value; save(); toast('Saved'); }
      });
      root.querySelector('#exp').addEventListener('click', () => {
        const me = S.me, blob = new Blob([JSON.stringify({ profile: { name: me.name, device: me.device, identity: me.identity }, settings: s, daily: me.daily, activities: me.activities }, null, 1)], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'locked-my-data.json'; a.click();
      });
      root.querySelector('#rst').addEventListener('click', () => { if (confirm('Reset everything saved on this device?')) resetLocal(); });
      root.querySelector('#del').addEventListener('click', () => sheet('<h3>Delete account</h3><p>In the live app this permanently deletes your profile, scores, messages and device connections within 30 days, as GDPR requires. In this preview there is no account to delete.</p>'));
    },
  };
}

export function how() {
  return {
    title: 'How scores work', back: '#/settings',
    html: `<div class="card" style="max-width:720px"><div class="stack" style="gap:16px;font-size:15px;line-height:1.6">
      <p><b>One scale for every device.</b> Whoop, Garmin, Oura and the rest each have their own secret recipe for recovery and readiness, so Locked ignores those scores. Instead it reads the raw measurements every device shares: overnight heart rate, heart-rate variability, sleep, steps and heart rate during workouts. Known differences between brands are corrected quietly before anything is scored.</p>
      <p><b>Your body, your baseline.</b> Recovery and HRV are compared with your own normal, learned over your first 14 days. Someone with naturally low HRV can still win the recovery board by recovering well.</p>
      <p><b>Effort is personal too.</b> Training stress comes from your heart rate against your own resting and threshold heart rate, so an hour that is hard for you scores the same as an hour that is hard for a friend, whether it's a run, a ride, a climb or a lifting session.</p>
      <p><b>Comparable things are compared directly.</b> Sleep hours, steps, resting heart rate and fitness are the same for everyone, so those boards use the real numbers.</p>
      <p><b>Strength is balanced for body weight</b> using DOTS, the formula powerlifting federations use.</p>
      <p><b>Missing data doesn't count against you.</b> A night without your watch is left out of your averages rather than scored as zero.</p>
      <p><b>The first 14 days are calibration.</b> Your scores stay hidden from boards until Locked knows your normal, so they're fair from the first day they show.</p>
    </div></div>`,
  };
}
