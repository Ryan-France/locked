import { S, P, isFriend, canSeeDetail, myGroups, history, save, friendIds } from '../store.js';
import { windowStats, weekStart, addDays, METRICS } from '../engine/scoring.js';
import { earnedBadges, BADGES, cabinet, AWARDS } from '../engine/awards.js';
import { strengthSummary } from '../engine/strength.js';
import { avatar, esc, fmt, fmtDate, spark, lineChart, info, deviceTag, recColor, sleepFmt, cvar, hm, toast, manualTag } from '../ui/components.js';
import { icon, SPORT_ICON, SPORT_NAME } from '../ui/icons.js';
import { post, bindPosts, zoneBar } from './feed.js';
import { medal, runBests } from './more.js';
import { rerender } from '../app.js';

const easyShare = (rows) => {
  let e = 0, t = 0;
  for (const r of rows) for (const a of r.acts) { if (!['run', 'bike'].includes(a.sport)) continue; const z = [1, 2, 3, 4, 5].map((i) => a[`z${i}_min`] || 0); e += z[0] + z[1]; t += z.reduce((s, v) => s + v, 0); }
  return t ? Math.round(e / t * 100) : null;
};

function titlesHeld(p) {
  const out = [];
  for (const g of myGroups()) {
    if (!g.members.includes(p.id)) continue;
    const last = history(g.id)[0]; if (!last) continue;
    for (const c of Object.values(last.champions)) if (c.winner.id === p.id) out.push(`<span class="tag" style="color:${cvar(c.award.color)}">${icon('trophy')}${c.award.short} · ${esc(g.name)}</span>`);
  }
  return out.join('');
}

export function view(id) {
  const p = P(id);
  if (!p) return { title: 'Not found', back: '#/home', html: '<div class="empty">This person doesn\'t exist.</div>' };
  const me = p.id === S.me.id, friend = isFriend(p.id), detail = canSeeDetail(p.id);
  const rows = p.series.rows, t = rows[rows.length - 1], cal = p.series.calibration;
  const wk = windowStats(p.series, weekStart(S.today), S.today);
  const d7 = windowStats(p.series, addDays(S.today, -6), S.today);
  const last28 = rows.slice(-28), last90 = rows.slice(-90);
  const ctl7 = rows[rows.length - 8]?.ctl ?? t.ctl;
  const easy = easyShare(last28);
  const badges = earnedBadges(p.series);
  const str = p.bodyweight ? strengthSummary(p.activities, p.bodyweight, addDays(S.today, -90)) : null;
  const bests = runBests(p);
  const goal = me && S.settings.showGoal && p.goalOptional;
  const awards = {}; for (const g of myGroups()) if (g.members.includes(p.id)) for (const e of cabinet(history(g.id))) if (e.person.id === p.id) for (const k of Object.keys(AWARDS)) awards[k] = (awards[k] || 0) + e[k];
  const awardTotal = Object.values(awards).reduce((s, v) => s + v, 0);

  const actions = me
    ? `<a class="btn ghost sm" href="#/connect">${icon('watch')}Devices</a><a class="btn ghost sm" href="#/log">${icon('plus')}Log workout</a><a class="btn ghost sm" href="#/friends">${icon('users')}Friends</a>`
    : friend ? `<a class="btn sm" href="#/h2h/new?vs=${p.id}">${icon('vs')}Challenge</a><a class="btn ghost sm" href="#/dm/${p.id}">${icon('chat')}Message</a>`
    : `<button class="btn sm" data-addf>${icon('plus')}Add friend</button>`;

  const card = (metric, ic, color, title, k, big, sub, sp) => `<a class="card c3" href="#/u/${p.id}/m/${metric}"><div class="card-h"><span class="ic" style="--c:${color}">${icon(ic)}</span><span class="t">${title}</span><span class="k">${k}</span></div>
    <div class="num big">${big}</div><p class="sub">${sub}</p>${sp}</a>`;

  const glance = detail ? `<div class="grid">
    ${card('recovery', 'gauge', 'var(--recovery)', 'Recovery', 'Today', `<span style="color:${recColor(t.recovery)}">${t.recovery ?? '–'}</span><small>%</small>`, `Week ${wk.recovery ?? '–'}%`, spark(last28.map((r) => r.recovery), 'var(--recovery)'))}
    ${card('sleep', 'moon', 'var(--sleep)', 'Sleep', '7-night avg', sleepFmt(d7.sleepH) + '<small>h</small>', `Score ${d7.sleepScore ?? '–'}`, spark(last28.map((r) => r.sleep), 'var(--sleep)'))}
    ${card('load', 'bolt', 'var(--load)', 'Last 7 days', 'Volume', fmt(d7.hours, 1) + '<small>h</small>', `${d7.tss} training stress`, spark(last28.map((r) => r.tss), 'var(--ink)'))}
    ${card('fitness', 'flame', 'var(--fitness)', 'Fitness', 'CTL', fmt(t.ctl, 0), `<span class="${t.ctl - ctl7 >= 0 ? 'up' : 'down'}">${t.ctl - ctl7 >= 0 ? '+' : ''}${fmt(t.ctl - ctl7, 1)}</span> vs last week · Form ${fmt(t.tsb, 0)}`, spark(last90.map((r) => r.ctl), 'var(--fitness)'))}
    ${card('rhr', 'heart', 'var(--heart)', 'Resting HR', '7-day avg', (d7.rhr ?? '–') + '<small>bpm</small>', `Normal ${p.series.phys.rhr} bpm`, spark(last28.map((r) => r.rhr), 'var(--heart)', { fill: false }))}
    ${card('hrv', 'pulse', 'var(--recovery)', 'HRV', 'vs normal', (t.hrvTrend == null ? '–' : (t.hrvTrend > 0 ? '+' : '') + t.hrvTrend) + '<small>%</small>', `${t.hrv ?? '–'} ms · normal ${t.hrvBase ?? '–'}`, spark(last28.map((r) => r.hrv), 'var(--recovery)', { fill: false }))}
    ${card('easy', 'timer', 'var(--z2)', 'Easy time', '28 days', `<span style="color:${easy == null ? 'inherit' : easy >= 75 ? 'var(--good)' : 'var(--bad)'}">${easy ?? '–'}</span><small>%</small>`, 'Target 80%', spark(rows.slice(-90).map((_, i, a) => i % 7 ? null : easyShare(a.slice(Math.max(0, i - 27), i + 1))).filter((v) => v !== null), 'var(--z2)'))}
    ${card('steps', 'steps', 'var(--steps)', 'Steps', '7-day avg', d7.steps == null ? '–' : fmt(d7.steps), d7.steps == null ? 'Not sent by this device yet' : 'a day', spark(last28.map((r) => r.steps), 'var(--steps)'))}
  </div>` : `<div class="grid"><div class="card c3"><span class="lbl">Overall</span><div class="num big">${wk.overall ?? '–'}</div><p class="sub">This week</p></div>
    <div class="card c3"><span class="lbl">Recovery</span><div class="num big">${wk.recovery ?? '–'}<small>%</small></div><p class="sub">This week</p></div>
    <div class="card c3"><span class="lbl">Load</span><div class="num big">${wk.tss}</div><p class="sub">This week</p></div>
    <div class="card c3"><span class="lbl">Sleep</span><div class="num big">${wk.sleepScore ?? '–'}</div><p class="sub">This week</p></div>
    <div class="card c12 lockd">${icon('lock')}<p>Add ${esc(p.first)} as a friend to see heart rate, HRV, sleep detail and workouts.</p><button class="btn sm" data-addf>Add friend</button></div></div>`;

  const recent = detail ? p.activities.slice().sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || ''))).slice(0, 5) : [];
  const html = `
    <section class="phead">${avatar(p, { size: 'lg', link: false })}
      <div><h2 class="display ink-bleed">${esc(p.name)}</h2>
        <div class="pm"><span class="tag">${esc(p.identity || 'Athlete')}</span>${deviceTag(p)}${p.town ? `<span class="tag">${esc(p.town)}</span>` : ''}${wk.manual ? manualTag() : ''}${titlesHeld(p)}</div>
        <div class="pa">${actions}</div></div></section>
    ${!cal.done ? `<div class="card row mt" style="gap:12px">${icon('lock')}<p style="flex:1"><b>Calibrating, day ${cal.day} of 14.</b> <span class="muted">Scores go public ${fmtDate(cal.unlocks, { weekday: 'long', day: 'numeric', month: 'short' })}.</span></p>${info('calibration')}</div>` : ''}
    ${goal ? `<div class="card goal mt"><div><span class="lbl">Goal</span><div class="display ink-bleed">${esc(goal.name)}</div></div><div style="text-align:right"><span class="num big">${Math.max(0, Math.round((Date.parse(goal.date) - Date.parse(S.today)) / 864e5))}</span><p class="sub">days to go</p></div></div>` : ''}
    <h2 class="sec"><span>At a glance</span>${detail ? '<span class="sub" style="margin:0">Tap any card for the detail</span>' : ''}</h2>
    ${glance}
    <h2 class="sec"><span>Trophies</span><a href="#/badges${me ? '' : '?u=' + p.id}">All badges</a></h2>
    <div class="grid">
      <div class="card c6 wide"><div class="card-h"><span class="ic" style="--c:var(--gold)">${icon('trophy')}</span><span class="t">Weekly titles</span><span class="k">${awardTotal} total</span></div>
        <div class="row" style="justify-content:space-around;text-align:center">${Object.entries(AWARDS).map(([k, a]) => `<div><div class="num big" style="color:${cvar(a.color)}">${awards[k] || 0}</div><span class="lbl">${a.short}</span></div>`).join('')}</div></div>
      <div class="card c6 wide"><div class="card-h"><span class="ic" style="--c:var(--gold)">${icon('medal')}</span><span class="t">Badges</span><span class="k">${Object.keys(badges).length} of ${BADGES.length}</span></div>
        <div class="row" style="gap:6px;flex-wrap:wrap">${BADGES.filter((b) => badges[b.id]).slice(0, 6).map((b) => `<span title="${esc(b.name)}" style="width:46px">${medal(b, true)}</span>`).join('') || '<p class="muted">No badges yet.</p>'}</div></div>
      ${detail && bests.length ? `<a class="card c6 wide" href="#/records"><div class="card-h"><span class="ic" style="--c:var(--load)">${icon('run')}</span><span class="t">Run bests</span></div><div class="kv">${bests.map((b) => `<div><span class="lbl">${b.label}</span><span class="num">${b.time}</span><span class="sub" style="margin:0">${fmtDate(b.date)}</span></div>`).join('')}</div></a>` : ''}
      ${detail && str && str.n ? `<a class="card c6 wide" href="#/records"><div class="card-h"><span class="ic" style="--c:var(--violet)">${icon('dumbbell')}</span><span class="t">Strength</span><span class="k">DOTS</span></div><div class="kv">${Object.entries(str.lifts).map(([k, v]) => `<div><span class="lbl">${k}</span><span class="num">${fmt(v, 0)}<small class="muted"> kg</small></span></div>`).join('')}<div><span class="lbl">DOTS</span><span class="num">${fmt(str.dots, 1)}</span></div></div></a>` : ''}
    </div>
    ${detail ? `<h2 class="sec"><span>Recent workouts</span></h2><div class="card"><div class="list">${recent.map((a) => `<a class="li" href="#/u/${p.id}/a/${a.id}"><span class="ic" style="width:34px;height:34px;display:grid;place-items:center;border:1px solid var(--line-2);border-radius:var(--r-xs)">${icon(SPORT_ICON[a.sport] || 'pulse')}</span><span class="grow"><span class="ttl">${esc(a.name)} ${a.manual ? manualTag() : ''}</span><span class="s">${fmtDate(a.date, { weekday: 'short', day: 'numeric', month: 'short' })} · ${hm(a.minutes)}${a.km ? ' · ' + fmt(a.km, 1) + ' km' : ''}</span></span><span class="num">${a.stress}</span></a>`).join('') || '<p class="muted">No workouts yet.</p>'}</div></div>` : ''}
  `;
  return {
    title: me ? 'Profile' : p.first, back: me ? null : 'javascript:history.back()', html,
    actions: me ? `<a class="iconbtn" href="#/settings" aria-label="Settings">${icon('settings')}</a>` : undefined,
    mount(root) {
      root.addEventListener('click', (e) => { const b = e.target.closest('[data-addf]'); if (b) { b.outerHTML = '<span class="tag">Request sent</span>'; toast(`Friend request sent to ${p.first}`); } });
    },
  };
}

// ---------- deep dive ----------
const DIVE = { range: 90, vs: '' };
const DIVE_META = {
  recovery: ['Recovery', 'recovery'], sleep: ['Sleep', 'sleep'], load: ['Training load', 'load'], fitness: ['Fitness, fatigue and form', 'fitness'],
  rhr: ['Resting heart rate', 'rhr'], hrv: ['Heart-rate variability', 'hrv'], steps: ['Steps', 'steps'], easy: ['Easy time', 'load'], consistency: ['Consistency', 'consistency'],
};

export function metric(id, m) {
  const p = P(id);
  if (!p || !DIVE_META[m]) return { title: 'Not found', back: '#/home', html: '<div class="empty">Nothing here.</div>' };
  if (!canSeeDetail(p.id)) return { title: p.first, back: `#/u/${p.id}`, html: `<div class="card lockd">${icon('lock')}<p>Add ${esc(p.first)} as a friend to see this.</p></div>` };
  const rows = p.series.rows.slice(-DIVE.range);
  const vsP = DIVE.vs && P(DIVE.vs) && DIVE.vs !== p.id ? P(DIVE.vs) : null;
  const vsRows = vsP ? Object.fromEntries(vsP.series.rows.map((r) => [r.date, r])) : null;
  const X = (k, rs = rows) => rs.map((r) => ({ x: r.date, y: r[k] }));
  const VS = (k) => vsRows ? [{ values: rows.map((r) => ({ x: r.date, y: vsRows[r.date]?.[k] ?? null })), color: 'var(--muted)', dash: '4 4', width: 1.6 }] : [];
  const s = windowStats(p.series, rows[0].date, S.today);
  const vals = (k) => rows.map((r) => r[k]).filter((v) => v != null);
  const avg = (k) => { const v = vals(k); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  let chart = '', kv = [], extra = '';
  const comparable = ['sleep', 'load', 'fitness', 'rhr', 'steps'].includes(m);

  if (m === 'recovery') {
    chart = lineChart([{ values: rows.map((r) => ({ x: r.date, y: r.recovery, c: recColor(r.recovery) })), color: 'var(--recovery)' }], { bars: true, yLabel: 'Recovery %' });
    const v = vals('recovery');
    kv = [['Average', Math.round(avg('recovery')) + '%'], ['Green days', v.filter((x) => x >= 67).length], ['Yellow', v.filter((x) => x >= 34 && x < 67).length], ['Red', v.filter((x) => x < 34).length]];
    extra = `<p class="sub">Green is 67% and above, red is below 34%. Recovery compares you only with your own normal, so it is fair between devices and body types.</p>`;
  } else if (m === 'sleep') {
    chart = lineChart([{ values: X('sleep'), color: 'var(--sleep)' }, ...VS('sleep')], { bars: !vsP, band: [8, 8.02], yLabel: 'Hours asleep' });
    const beds = vals('bed'); const bed = beds.length ? Math.round(beds.reduce((a, b) => a + b, 0) / beds.length) : null;
    kv = [['Average', sleepFmt(avg('sleep'))], ['Score', Math.round(avg('sleepScore') || 0)], ['8 h nights', vals('sleep').filter((x) => x >= 8).length], ['Avg bedtime', bed == null ? '–' : `${String(Math.floor((18 * 60 + bed) / 60) % 24).padStart(2, '0')}:${String((18 * 60 + bed) % 60).padStart(2, '0')}`]];
  } else if (m === 'load') {
    chart = lineChart([{ values: X('tss'), color: 'var(--load)', opacity: .75 }], { bars: true, yLabel: 'Daily training stress' }) + lineChart([{ values: X('ctl'), color: 'var(--fitness)' }, { values: X('atl'), color: 'var(--sleep)', width: 1.4 }, ...VS('ctl')], { h: 160, yLabel: 'Fitness and fatigue' });
    const by = {}; for (const r of rows) for (const a of r.acts) { (by[a.sport] ||= { h: 0, tss: 0, n: 0 }); by[a.sport].h += a.minutes / 60; by[a.sport].tss += a.stress; by[a.sport].n++; }
    kv = [['Total stress', fmt(s.tss)], ['Hours', fmt(s.hours, 1)], ['Per week', fmt(s.tss / rows.length * 7)], ['Active days', s.activeDays]];
    extra = `<h2 class="sec"><span>By sport</span></h2><div class="card tscroll"><table class="t"><thead><tr><th>Sport</th><th class="n">Sessions</th><th class="n">Hours</th><th class="n">Stress</th><th class="n">Stress / h</th></tr></thead><tbody>${Object.entries(by).sort((a, b) => b[1].tss - a[1].tss).map(([k, v]) => `<tr><td>${SPORT_NAME[k] || k}</td><td class="n">${v.n}</td><td class="n">${fmt(v.h, 1)}</td><td class="n">${v.tss}</td><td class="n">${fmt(v.tss / v.h, 0)}</td></tr>`).join('')}</tbody></table></div>`;
  } else if (m === 'fitness') {
    chart = lineChart([{ values: X('ctl'), color: 'var(--fitness)', width: 2.4 }, { values: X('atl'), color: 'var(--sleep)', width: 1.4 }, { values: X('tsb'), color: 'var(--muted)', dash: '3 3', width: 1.4 }, ...VS('ctl')], { yLabel: 'Fitness' });
    const last = rows[rows.length - 1];
    kv = [['Fitness', fmt(last.ctl, 1)], ['Fatigue', fmt(last.atl, 1)], ['Form', fmt(last.tsb, 1)], ['Peak', fmt(Math.max(...vals('ctl')), 1)]];
    extra = `<p class="sub">Solid line: fitness (42-day average of training stress). Blue: fatigue (7-day). Dashed: form, fitness minus fatigue. Form below −30 is a warning sign.</p>`;
  } else if (m === 'rhr') {
    chart = lineChart([{ values: X('rhr'), color: 'var(--heart)', dots: true }, ...VS('rhr')], { yLabel: 'Resting heart rate' });
    kv = [['Average', Math.round(avg('rhr')) + ' bpm'], ['Lowest', Math.min(...vals('rhr')) + ' bpm'], ['Normal', p.series.phys.rhr + ' bpm'], ['Days measured', vals('rhr').length]];
  } else if (m === 'hrv') {
    chart = lineChart([{ values: X('hrv'), color: 'var(--recovery)', dots: true }, { values: X('hrvBase'), color: 'var(--muted)', dash: '4 4', width: 1.4 }], { yLabel: 'HRV ms' });
    kv = [['Latest', (rows[rows.length - 1].hrv ?? '–') + ' ms'], ['Your normal', (rows[rows.length - 1].hrvBase ?? '–') + ' ms'], ['Vs normal', (s.hrvTrend ?? '–') + '%'], ['Nights', vals('hrv').length]];
    extra = `<p class="sub">Dashed line: your 30-day normal. HRV is personal, so friends are compared on how far they sit from their own normal, never on raw milliseconds.</p>`;
  } else if (m === 'steps') {
    chart = vals('steps').length ? lineChart([{ values: X('steps'), color: 'var(--steps)' }], { bars: true, yLabel: 'Steps' }) : `<div class="empty">${esc(p.first)}'s device isn't sending steps yet.</div>`;
    kv = [['Average', fmt(avg('steps'))], ['Best day', fmt(Math.max(0, ...vals('steps')))], ['10k days', vals('steps').filter((x) => x >= 10000).length], ['Days', vals('steps').length]];
  } else if (m === 'easy') {
    const weeks = []; for (let i = rows.length - 1; i >= 0; i -= 7) weeks.unshift(rows.slice(Math.max(0, i - 6), i + 1));
    chart = lineChart([{ values: weeks.map((w) => ({ x: w[w.length - 1].date, y: easyShare(w), c: (easyShare(w) ?? 0) >= 75 ? 'var(--good)' : 'var(--z3)' })), color: 'var(--z2)' }], { bars: true, band: [80, 80.5], yLabel: 'Easy share by week' });
    kv = [['Last 28 days', (easyShare(rows.slice(-28)) ?? '–') + '%'], ['Target', '80%']];
    extra = `<p class="sub">Share of run and ride time in heart-rate zones 1 and 2, from the watch's own zones.</p>`;
  } else if (m === 'consistency') {
    chart = lineChart([{ values: rows.map((r) => ({ x: r.date, y: r.tss >= 15 || (r.steps || 0) >= 10000 ? 1 : 0, c: r.tss >= 15 ? 'var(--consistency)' : 'var(--chip-2)' })), color: 'var(--consistency)' }], { bars: true, h: 120, yLabel: 'Active days' });
    kv = [['Active days', s.activeDays + ' of ' + rows.length], ['Score', s.consistency + '%']];
  }

  const friends = [S.me.id, ...friendIds()].filter((x) => x !== p.id);
  const html = `<div class="row between" style="flex-wrap:wrap;gap:8px">
      <div class="seg">${[[30, '30 days'], [90, '90 days'], [365, 'All']].map(([k, l]) => `<button data-range="${k}" aria-pressed="${DIVE.range === k}">${l}</button>`).join('')}</div>
      ${comparable ? `<label class="row" style="gap:8px"><span class="sub" style="margin:0">Compare with</span><select class="select" id="vs" style="width:auto;height:34px">${['', ...friends].map((f) => `<option value="${f}" ${DIVE.vs === f ? 'selected' : ''}>${f ? esc(f === S.me.id ? 'You' : P(f).first) : 'Nobody'}</option>`).join('')}</select></label>` : ''}
    </div>
    <div class="card mt">${chart}${vsP ? `<p class="sub">Dashed grey: ${esc(vsP.first)}</p>` : ''}</div>
    <div class="kv mt">${kv.map(([k, v]) => `<div><span class="lbl">${k}</span><span class="num">${v}</span></div>`).join('')}</div>
    ${extra}`;
  return {
    title: `${p.id === S.me.id ? '' : p.first + ' · '}${DIVE_META[m][0]}`, back: `#/u/${p.id}`, html,
    actions: `${info(DIVE_META[m][1] === 'fitness' ? 'fitness' : DIVE_META[m][1])}`,
    mount(root) {
      root.addEventListener('click', (e) => { const b = e.target.closest('[data-range]'); if (b) { DIVE.range = +b.dataset.range; rerender(); } });
      root.querySelector('#vs')?.addEventListener('change', (e) => { DIVE.vs = e.target.value; rerender(); });
    },
  };
}

export function activity(id, aid) {
  const p = P(id), a = p?.activities.find((x) => x.id === aid);
  if (!a) return { title: 'Workout', back: '#/feed', html: '<div class="empty">This workout no longer exists.</div>' };
  if (!canSeeDetail(p.id)) return { title: 'Workout', back: `#/u/${p.id}`, html: `<div class="card lockd">${icon('lock')}<p>Only friends can see workouts.</p></div>` };
  const z = [1, 2, 3, 4, 5].map((i) => a[`z${i}_min`] || 0), zt = z.reduce((s, v) => s + v, 0);
  const html = `${post(p, a, { full: true })}
    ${zt ? `<h2 class="sec"><span>Heart-rate zones</span></h2><div class="card">${z.map((v, i) => `<div class="row" style="margin:6px 0"><span class="lbl" style="width:28px">Z${i + 1}</span><span style="flex:1;height:10px;background:var(--chip);border-radius:2px;overflow:hidden"><i style="display:block;height:100%;width:${v / zt * 100}%;background:var(--z${i + 1})"></i></span><span class="num" style="width:70px;text-align:right">${hm(v)}</span></div>`).join('')}</div>` : ''}
    ${a.sets ? `<h2 class="sec"><span>Sets</span></h2><div class="card tscroll"><table class="t"><thead><tr><th>Lift</th><th class="n">Weight</th><th class="n">Reps</th></tr></thead><tbody>${a.sets.map((s) => `<tr><td style="text-transform:capitalize">${esc(s.lift)}</td><td class="n">${s.kg} kg</td><td class="n">${s.reps}</td></tr>`).join('')}</tbody></table></div>` : ''}
    <p class="sub mt">Recorded by ${a.manual ? 'hand (manual entry)' : esc(p.device === 'apple' ? 'Apple Watch' : p.device[0].toUpperCase() + p.device.slice(1))}. Training stress is worked out from ${esc(p.first)}'s own heart-rate range.</p>`;
  return { title: a.name, back: 'javascript:history.back()', html, mount: bindPosts };
}
