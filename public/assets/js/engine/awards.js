// Weekly champions, badges and head-to-heads.

import { windowStats, addDays, weekStart, daysBetween, METRICS } from './scoring.js';

// Weeks run Monday → Sunday. Champions are announced Sunday at 18:00 (Dublin).
export const ANNOUNCE_HOUR = 18;

export const AWARDS = {
  recovery:    { label: 'Recovery champion',    short: 'Recovery',    key: 'recovery',    tiebreak: 'validRecovery', minValid: 'validRecovery', color: 'recovery' },
  load:        { label: 'Training load champion', short: 'Load',      key: 'tss',         tiebreak: 'hours',         minValid: null,            color: 'load' },
  sleep:       { label: 'Sleep champion',       short: 'Sleep',       key: 'sleepScore',  tiebreak: 'sleepH',        minValid: 'validSleep',    color: 'sleep' },
  consistency: { label: 'Consistency champion', short: 'Consistency', key: 'consistency', tiebreak: 'tss',           minValid: null,            color: 'consistency' },
};
const MIN_VALID_DAYS = 4;   // need 4 of 7 nights of data to win recovery or sleep

// Champions for one group for the week starting `monday`.
export function weekChampions(members, monday) {
  const sunday = addDays(monday, 6);
  const out = {};
  for (const [id, aw] of Object.entries(AWARDS)) {
    const rows = members
      .filter((p) => sunday >= p.series.calibration.unlocks)
      .map((p) => ({ p, s: windowStats(p.series, monday, sunday) }))
      .filter((r) => r.s[aw.key] != null && (!aw.minValid || r.s[aw.minValid] >= MIN_VALID_DAYS));
    rows.sort((a, b) => (b.s[aw.key] - a.s[aw.key]) || ((b.s[aw.tiebreak] || 0) - (a.s[aw.tiebreak] || 0)));
    if (rows.length) out[id] = { id, award: aw, winner: rows[0].p, value: rows[0].s[aw.key], runnerUp: rows[1] && rows[1].p, week: monday };
  }
  return out;
}

// All completed weeks for a group, newest first.
export function championHistory(members, today, weeks = 10) {
  const thisMon = weekStart(today);
  const hist = [];
  for (let w = 1; w <= weeks; w++) {
    const mon = addDays(thisMon, -7 * w);
    const ch = weekChampions(members, mon);
    if (Object.keys(ch).length) hist.push({ week: mon, champions: ch });
  }
  return hist;
}

// The halo: last week's awards a person holds in this group, shown until the
// next announcement.
export function halos(history) {
  const last = history[0];
  const map = {};
  if (!last) return map;
  for (const c of Object.values(last.champions)) (map[c.winner.id] ||= []).push(c.id);
  return map;
}

export function cabinet(history) {
  const by = {};
  for (const wk of history) for (const c of Object.values(wk.champions)) {
    const e = (by[c.winner.id] ||= { person: c.winner, total: 0, recovery: 0, load: 0, sleep: 0, consistency: 0 });
    e.total++; e[c.id]++;
  }
  return Object.values(by).sort((a, b) => b.total - a.total);
}

// ---------- badges (Garmin-style, earned once, dated) ----------
export const BADGES = [
  { id: 'sleep-demon',   name: 'Sleep demon',   tier: 'gold',   desc: '8 hours or more, seven nights in a row.' },
  { id: 'iron-week',     name: 'Iron week',     tier: 'gold',   desc: 'Trained every day for a full Monday-to-Sunday week.' },
  { id: 'green-week',    name: 'Green week',    tier: 'silver', desc: 'Averaged 67% recovery or higher for a week.' },
  { id: 'century',       name: 'Century',       tier: 'silver', desc: '100 training stress in a single day.' },
  { id: 'big-week',      name: 'Big week',      tier: 'gold',   desc: '600 training stress in one week.' },
  { id: 'streak-30',     name: 'Thirty straight', tier: 'gold', desc: 'A 30-day streak of active days.' },
  { id: 'bounce-back',   name: 'Bounce back',   tier: 'bronze', desc: 'Recovery up 30 points overnight.' },
  { id: 'marathoner',    name: 'Marathoner',    tier: 'gold',   desc: 'Ran 42.2 km in one go.' },
  { id: 'early-nights',  name: 'Early nights',  tier: 'bronze', desc: 'In bed before 22:30 five nights in a week.' },
  { id: 'step-up',       name: 'Step up',       tier: 'bronze', desc: '15,000 steps in a day.' },
];

export function earnedBadges(series) {
  const rows = series.rows;
  const got = {};
  const give = (id, date) => { if (!got[id]) got[id] = date; };
  let sleepRun = 0, activeRun = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    sleepRun = r.sleep >= 8 ? sleepRun + 1 : 0; if (sleepRun >= 7) give('sleep-demon', r.date);
    activeRun = r.tss >= 15 || (r.steps || 0) >= 10000 ? activeRun + 1 : 0; if (activeRun >= 30) give('streak-30', r.date);
    if (r.tss >= 100) give('century', r.date);
    if ((r.steps || 0) >= 15000) give('step-up', r.date);
    const prev = rows[i - 1];
    if (prev && r.recovery != null && prev.recovery != null && r.recovery - prev.recovery >= 30) give('bounce-back', r.date);
    if (r.acts.some((a) => a.sport === 'run' && a.km >= 42.0)) give('marathoner', r.date);
    if (new Date(r.date + 'T12:00:00Z').getUTCDay() === 0 && i >= 6) {
      const wk = rows.slice(i - 6, i + 1);
      if (wk.every((x) => x.tss >= 15)) give('iron-week', r.date);
      if (wk.reduce((s, x) => s + x.tss, 0) >= 600) give('big-week', r.date);
      const rec = wk.map((x) => x.recovery).filter((v) => v != null);
      if (rec.length >= 5 && rec.reduce((s, v) => s + v, 0) / rec.length >= 67) give('green-week', r.date);
      if (wk.filter((x) => x.bed != null && x.bed <= 270).length >= 5) give('early-nights', r.date);
    }
  }
  return got;
}

// ---------- head-to-head ----------
export function h2hState(ch, people, today) {
  const a = people[ch.a], b = people[ch.b];
  const to = today < ch.end ? today : ch.end;
  const key = METRICS[ch.metric].key;
  const va = windowStats(a.series, ch.start, to)[key], vb = windowStats(b.series, ch.start, to)[key];
  const low = METRICS[ch.metric].better === 'low';
  const lead = va == null || vb == null || va === vb ? null : ((low ? va < vb : va > vb) ? ch.a : ch.b);
  return { a, b, va, vb, lead, done: today > ch.end, daysLeft: Math.max(0, daysBetween(today, ch.end)) };
}
