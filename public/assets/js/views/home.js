import { S, P, group, history, nextAnnouncement, circle, myGroups } from '../store.js';
import { windowStats, addDays, weekStart } from '../engine/scoring.js';
import { h2hState, AWARDS } from '../engine/awards.js';
import { METRICS } from '../engine/scoring.js';
import { avatar, ring, spark, esc, fmt, fmtDate, info, recColor, sleepFmt, cvar, hm } from '../ui/components.js';
import { icon, SPORT_ICON, SPORT_NAME } from '../ui/icons.js';
import { renderBoard } from './boards.js';

export function winsBlock(scope) {
  const last = history(scope)[0];
  if (!last) return `<p class="muted">The first champions are crowned this Sunday at 18:00.</p>`;
  return `<div class="wins">${Object.values(last.champions).map((c) => `
    <a class="win" href="#/u/${c.winner.id}" style="--c:${cvar(c.award.color)}">${avatar(c.winner, { size: 'sm', halo: [c.id], link: false })}
      <span class="grow"><span class="aw">${c.award.short}</span><br><span class="wn">${esc(c.winner.id === S.me.id ? 'You' : c.winner.first)}</span></span>
      <span class="num">${c.id === 'load' ? c.value : c.value + (c.id === 'sleep' ? '' : '%')}</span></a>`).join('')}</div>`;
}

export function countdownText() {
  const ms = nextAnnouncement().ms, d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), m = Math.floor(ms % 36e5 / 6e4);
  return d ? `${d}d ${h}h` : `${h}h ${m}m`;
}

export function view() {
  const me = S.me, rows = me.series.rows, today = rows[rows.length - 1];
  const cal = me.series.calibration;
  const hour = new Date().getHours();
  const hi = hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
  const scope = group(S.settings.homeBoard)?.members.includes(me.id) ? S.settings.homeBoard : (myGroups()[0]?.id || 'friends');
  const wk = windowStats(me.series, weekStart(S.today), S.today);
  const last28 = rows.slice(-28);
  const ctl7 = rows[rows.length - 8]?.ctl;
  const ch = (S.data.challenges.concat(S.local.challenges)).find((c) => c.status === 'active' && (c.a === me.id || c.b === me.id));
  const recentFriends = circle().filter((p) => p.id !== me.id).flatMap((p) => p.activities.filter((a) => a.date >= addDays(S.today, -2)).map((a) => ({ p, a })))
    .sort((x, y) => (y.a.date + y.a.time).localeCompare(x.a.date + x.a.time)).slice(0, 4);

  const calib = !cal.done ? `<div class="card calib mt"><svg class="dial" viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="none" stroke="var(--chip-2)" stroke-width="5"/><circle class="arc" cx="32" cy="32" r="28" fill="none" stroke="var(--brand-ink)" stroke-width="5" stroke-dasharray="176" stroke-dashoffset="176" data-off="${176 * (1 - cal.day / 14)}" transform="rotate(-90 32 32)"/></svg>
    <div><b>Calibrating, day ${cal.day} of 14</b><p class="sub" style="margin-top:2px">Your scores go public on ${fmtDate(cal.unlocks, { weekday: 'long', day: 'numeric', month: 'long' })}.</p><div class="dots14">${Array.from({ length: 14 }, (_, i) => `<i class="${i < cal.day ? 'on' : ''}"></i>`).join('')}</div></div></div>` : '';

  let h2h = '';
  if (ch) {
    const st = h2hState(ch, S.people, S.today), opp = ch.a === me.id ? st.b : st.a;
    const mine = ch.a === me.id ? st.va : st.vb, theirs = ch.a === me.id ? st.vb : st.va;
    h2h = `<a class="card c6 wide" href="#/h2h/${ch.id}"><div class="card-h"><span class="ic" style="--c:var(--load)">${icon('vs')}</span><span class="t">Head-to-head</span><span class="k">${st.daysLeft} days left</span></div>
      <div class="row between"><div class="row">${avatar(me, { size: 'sm', link: false })}<span class="num big" style="font-size:30px">${fmt(mine)}</span></div>
      <span class="lbl">${METRICS[ch.metric].label}</span><div class="row"><span class="num big" style="font-size:30px">${fmt(theirs)}</span>${avatar(opp, { size: 'sm', link: false })}</div></div>
      <p class="sub">${st.lead === me.id ? 'You lead' : st.lead ? esc(opp.first) + ' leads' : 'Level'} · ${esc(ch.stake)}</p></a>`;
  }

  const html = `
    <section class="hello">
      <div><h2 class="display ink-bleed">${hi}, ${esc(me.first)}.</h2>
        <p class="when">${fmtDate(S.today, { weekday: 'long', day: 'numeric', month: 'long' })}</p></div>
      <a class="countdown" href="#/g/${scope}/champions"><span class="lbl">Champions in</span><br><span class="num">${countdownText()}</span></a>
    </section>
    ${calib}
    <div class="card rings mt">
      ${ring(today.recovery, 100, recColor(today.recovery), 'Recovery', today.recovery == null ? '–' : today.recovery + '%', today.hrv ? `HRV ${today.hrv} · RHR ${today.rhr}` : '')}
      ${ring(today.sleepScore, 100, 'var(--sleep)', 'Sleep', today.sleepScore ?? '–', today.sleep ? sleepFmt(today.sleep) + ' asleep' : 'No sleep data')}
      ${ring(today.tss, 150, 'var(--load)', 'Load today', today.tss, today.acts.length ? today.acts.length + ' session' + (today.acts.length > 1 ? 's' : '') : 'Rest so far')}
    </div>

    <h2 class="sec"><span>${esc(group(scope)?.name || 'Friends')} this week</span><a href="#/g/${scope}">Full board</a></h2>
    ${renderBoard({ scope, metric: 'overall', win: 'week', podium: false, limit: 5 })}

    <h2 class="sec"><span>Last week's champions</span>${info('champions')}</h2>
    ${winsBlock(scope)}

    <h2 class="sec"><span>Your week</span><a href="#/u/${me.id}">Profile</a></h2>
    <div class="grid">
      <a class="card c3" href="#/u/${me.id}/m/load"><div class="card-h"><span class="ic" style="--c:var(--load)">${icon('bolt')}</span><span class="t">Load</span>${info('load')}</div>
        <div class="num big" data-count="${wk.tss}">${wk.tss}</div><p class="sub">${wk.hours} h since Monday</p>${spark(last28.map((r) => r.tss), 'var(--load)')}</a>
      <a class="card c3" href="#/u/${me.id}/m/fitness"><div class="card-h"><span class="ic" style="--c:var(--fitness)">${icon('flame')}</span><span class="t">Fitness</span>${info('fitness')}</div>
        <div class="num big">${fmt(today.ctl, 0)}</div><p class="sub"><span class="${today.ctl - ctl7 >= 0 ? 'up' : 'down'}">${today.ctl - ctl7 >= 0 ? '+' : ''}${fmt(today.ctl - ctl7, 1)}</span> vs last week</p>${spark(rows.slice(-90).map((r) => r.ctl), 'var(--fitness)')}</a>
      <a class="card c3" href="#/u/${me.id}/m/rhr"><div class="card-h"><span class="ic" style="--c:var(--heart)">${icon('heart')}</span><span class="t">Resting HR</span>${info('rhr')}</div>
        <div class="num big">${wk.rhr ?? '–'}<small>bpm</small></div><p class="sub">Week average</p>${spark(last28.map((r) => r.rhr), 'var(--heart)', { fill: false })}</a>
      <a class="card c3" href="#/u/${me.id}/m/hrv"><div class="card-h"><span class="ic" style="--c:var(--recovery)">${icon('pulse')}</span><span class="t">HRV</span>${info('hrv')}</div>
        <div class="num big">${today.hrv ?? '–'}<small>ms</small></div><p class="sub">Normal ${today.hrvBase ?? '–'} ms</p>${spark(last28.map((r) => r.hrv), 'var(--recovery)', { fill: false })}</a>
      ${h2h}
      <div class="card ${h2h ? 'c6 wide' : 'c12'}"><div class="card-h"><span class="ic">${icon('feed')}</span><span class="t">Friends today</span><a class="k" href="#/feed">Feed</a></div>
        <div class="list">${recentFriends.map(({ p, a }) => `<a class="li" href="#/u/${p.id}/a/${a.id}">${avatar(p, { size: 'sm', link: false })}<span class="grow"><span class="ttl">${esc(p.first)} · ${esc(a.name)}</span><span class="s">${SPORT_NAME[a.sport] || 'Workout'} · ${hm(a.minutes)}${a.km ? ' · ' + fmt(a.km, 1) + ' km' : ''}</span></span><span class="num">${a.stress}</span></a>`).join('') || '<p class="muted">Nobody has trained yet today.</p>'}</div></div>
    </div>`;
  return { title: 'Locked', html };
}
