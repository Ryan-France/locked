// Locked scoring engine. Pure functions, no DOM — the same file runs in the
// browser today and in the Cloudflare Worker later. Spec: docs/SCORING.md.

import { normaliseDaily } from './devices.js';

export const CAL_DAYS = 14;          // calibration period before scores go public
export const SLEEP_NEED_H = 8;       // one sleep target for everyone (raw, comparable)
export const ACTIVE_TSS = 15;        // a day "counts" with ≥15 stress …
export const ACTIVE_STEPS = 10000;   // … or ≥10k steps
export const WEIGHTS = { recovery: 0.35, load: 0.35, sleep: 0.30 };
export const LOAD_HALF = 350;        // weekly stress that maps to a load score of ~63

// ---------- dates (YYYY-MM-DD strings, Europe/Dublin calendar days) ----------
export const addDays = (d, n) => { const t = new Date(d + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
export const daysBetween = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5);
export const weekStart = (d) => { const wd = (new Date(d + 'T12:00:00Z').getUTCDay() + 6) % 7; return addDays(d, -wd); };
export const monthStart = (d) => d.slice(0, 8) + '01';

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const mean = (a) => a.length ? a.reduce((s, v) => s + v, 0) / a.length : null;
const sd = (a) => { if (a.length < 2) return null; const m = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1)); };
const median = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const r1 = (x) => x == null ? null : Math.round(x * 10) / 10;

export const isStrength = (a) => a.sport === 'strength' || a.type === 'strength_training';

// ---------- personal physiology (learned during calibration) ----------
export function physiology(person) {
  const daily = person.daily.map((r) => normaliseDaily(r, person.device));
  const early = daily.slice(0, CAL_DAYS).map((r) => r.rhr_n).filter((v) => v != null);
  const rhr = person.rhr || Math.round(median(early) ?? 60);
  const observedMax = Math.max(0, ...person.activities.map((a) => a.max_hr || 0));
  // Max HR: what the person told us, else the higher of what we've seen and the
  // Tanaka estimate (208 − 0.7 × age). Lifters and climbers rarely touch their
  // real max, and an under-read max would inflate their training stress.
  const tanaka = person.age ? Math.round(208 - 0.7 * person.age) : 188;
  const hrmax = person.max_hr || Math.min(210, Math.max(observedMax, tanaka));
  const lthr = person.lthr || Math.round(rhr + 0.86 * (hrmax - rhr));
  return { rhr, hrmax, lthr };
}

// ---------- training stress per session (hrTSS, as on dontgetdropped.app) ----------
export function sessionStress(a, phys) {
  const h = (a.minutes || 0) / 60;
  let tss;
  if (a.sport === 'swim') tss = h * 56.25;                     // fixed IF 0.75
  else if (a.avg_hr == null) tss = h * 30;                     // no HR (manual entries)
  else {
    const IF = clamp((a.avg_hr - phys.rhr) / (phys.lthr - phys.rhr), 0, 1.1);
    tss = h * IF * IF * 100;
  }
  // Heart rate under-reads lifting (short sets, long rests). Correction factor
  // keeps an hour of hard lifting level with an hour of steady endurance work.
  if (isStrength(a)) tss *= 1.3;
  return Math.round(tss);
}

// ---------- the daily series ----------
// Returns one row per calendar day from the first data point to `today`.
export function buildSeries(person, today) {
  const phys = physiology(person);
  const daily = Object.fromEntries(person.daily.map((r) => [r.date, normaliseDaily(r, person.device)]));
  const acts = {};
  for (const a of person.activities) {
    a.stress = sessionStress(a, phys);
    (acts[a.date] ||= []).push(a);
  }
  const first = [...Object.keys(daily), ...Object.keys(acts)].sort()[0] || today;
  const rows = [];
  let ctl = 0, atl = 0;
  const hist = { lnhrv: [], rhr: [], bed: [] };

  for (let d = first, i = 0; d <= today; d = addDays(d, 1), i++) {
    const dr = daily[d] || {};
    const list = acts[d] || [];
    const tss = list.reduce((s, a) => s + a.stress, 0);
    ctl += (tss - ctl) / 42;
    atl += (tss - atl) / 7;

    const rhr = dr.rhr_n ?? null, hrv = dr.hrv_n ?? null, sleep = dr.sleep_n ?? null;
    const lnhrv = hrv ? Math.log(hrv) : null;
    const bed = dr.bed_min_after_18 ?? null;

    // baselines: previous 30 days of this person's own readings
    const base = (arr) => arr.slice(-30);
    const bl = base(hist.lnhrv), br = base(hist.rhr);
    const ready = bl.length >= 7 || br.length >= 7;

    // Recovery: how today's body compares with this person's own normal.
    let recovery = null, z = null;
    if ((lnhrv != null || rhr != null) && ready) {
      const parts = [];
      if (lnhrv != null && bl.length >= 7) parts.push([0.55, clamp((lnhrv - mean(bl)) / Math.max(sd(bl), 0.05), -3, 3)]);
      if (rhr != null && br.length >= 7) parts.push([0.25, clamp((mean(br) - rhr) / Math.max(sd(br), 1.5), -3, 3)]);
      if (sleep != null) parts.push([0.20, clamp(sleep - SLEEP_NEED_H, -2, 2)]);
      const w = parts.reduce((s, p) => s + p[0], 0);
      if (parts.length && w >= 0.25) {
        z = parts.reduce((s, p) => s + p[0] * p[1], 0) / w;
        recovery = Math.round(100 / (1 + Math.exp(-(1.15 * z + 0.55))));
      }
    }

    // Sleep: hours against one shared target, plus bedtime regularity.
    let sleepScore = null;
    if (sleep != null) {
      const beds = [...hist.bed.slice(-6), bed].filter((v) => v != null);
      const reg = beds.length >= 3 ? 1 - Math.min(1, sd(beds) / 90) : 0.75;
      sleepScore = Math.round(100 * (0.75 * Math.min(1, sleep / SLEEP_NEED_H) + 0.25 * reg));
    }

    const hrvBase = bl.length >= 7 ? Math.exp(mean(bl)) : null;
    rows.push({
      date: d, i, tss, ctl: r1(ctl), atl: r1(atl), tsb: r1(ctl - atl),
      rhr, hrv: hrv && Math.round(hrv), hrvBase: hrvBase && Math.round(hrvBase),
      hrvTrend: hrv && hrvBase ? Math.round((hrv / hrvBase - 1) * 100) : null,
      sleep: r1(sleep), bed, steps: dr.steps ?? null,
      recovery, sleepScore, z: r1(z),
      worn: rhr != null || hrv != null || sleep != null,
      manual: !!dr.manual || list.some((a) => a.manual),
      acts: list,
    });
    if (lnhrv != null) hist.lnhrv.push(lnhrv);
    if (rhr != null) hist.rhr.push(rhr);
    hist.bed.push(bed);
  }
  return { phys, rows, first, calibration: calibration(first, today) };
}

export function calibration(first, today) {
  const day = daysBetween(first, today) + 1;
  return { day: Math.min(day, CAL_DAYS), of: CAL_DAYS, done: day > CAL_DAYS, unlocks: addDays(first, CAL_DAYS) };
}

// ---------- window statistics (today / week / month / any range) ----------
export function windowStats(series, from, to) {
  const rows = series.rows.filter((r) => r.date >= from && r.date <= to);
  const n = rows.length || 1;
  const pick = (k) => rows.map((r) => r[k]).filter((v) => v != null);
  const rec = pick('recovery'), slp = pick('sleepScore'), slh = pick('sleep');
  const tss = rows.reduce((s, r) => s + r.tss, 0);
  const active = rows.filter((r) => r.tss >= ACTIVE_TSS || (r.steps || 0) >= ACTIVE_STEPS).length;
  const loadScore = Math.round(100 * (1 - Math.exp(-(tss / n * 7) / LOAD_HALF)));
  const recovery = rec.length ? Math.round(mean(rec)) : null;
  const sleepScore = slp.length ? Math.round(mean(slp)) : null;

  const parts = [[WEIGHTS.recovery, recovery], [WEIGHTS.load, loadScore], [WEIGHTS.sleep, sleepScore]].filter((p) => p[1] != null);
  const w = parts.reduce((s, p) => s + p[0], 0);
  const overall = parts.length >= 2 ? Math.round(parts.reduce((s, p) => s + p[0] * p[1], 0) / w) : null;

  const last = rows[rows.length - 1] || {};
  const manualTss = rows.reduce((s, r) => s + r.acts.filter((a) => a.manual).reduce((t, a) => t + a.stress, 0), 0);
  return {
    from, to, days: rows.length,
    overall, recovery, sleepScore, loadScore, tss,
    sleepH: slh.length ? r1(mean(slh)) : null,
    rhr: pick('rhr').length ? Math.round(mean(pick('rhr'))) : null,
    hrvTrend: pick('hrvTrend').length ? Math.round(mean(pick('hrvTrend'))) : null,
    steps: pick('steps').length ? Math.round(mean(pick('steps'))) : null,
    ctl: last.ctl ?? null, tsb: last.tsb ?? null,
    consistency: Math.round(100 * Math.min(1, active / Math.max(1, Math.ceil(n * 6 / 7)))),
    activeDays: active,
    validRecovery: rec.length, validSleep: slp.length,
    hours: r1(rows.reduce((s, r) => s + r.acts.reduce((t, a) => t + (a.minutes || 0), 0), 0) / 60),
    manual: manualTss > 0 || rows.some((r) => r.manual),
    manualShare: tss ? manualTss / tss : 0,
  };
}

// ---------- boards ----------
// Each metric: how to read it from window stats, which way is better, and
// whether it is compared raw or against the person's own baseline.
export const METRICS = {
  overall:     { label: 'Overall',      key: 'overall',     better: 'high', unit: '',    kind: 'score',    color: 'brand' },
  recovery:    { label: 'Recovery',     key: 'recovery',    better: 'high', unit: '%',   kind: 'personal', color: 'recovery' },
  load:        { label: 'Load',         key: 'tss',         better: 'high', unit: '',    kind: 'raw',      color: 'load' },
  sleep:       { label: 'Sleep',        key: 'sleepScore',  better: 'high', unit: '',    kind: 'raw',      color: 'sleep' },
  consistency: { label: 'Consistency',  key: 'consistency', better: 'high', unit: '%',   kind: 'raw',      color: 'consistency' },
  fitness:     { label: 'Fitness',      key: 'ctl',         better: 'high', unit: '',    kind: 'raw',      color: 'fitness' },
  rhr:         { label: 'Resting HR',   key: 'rhr',         better: 'low',  unit: 'bpm', kind: 'raw',      color: 'heart' },
  hrv:         { label: 'HRV trend',    key: 'hrvTrend',    better: 'high', unit: '%',   kind: 'personal', color: 'recovery' },
  steps:       { label: 'Steps',        key: 'steps',       better: 'high', unit: '',    kind: 'raw',      color: 'steps' },
};

export function windowFor(kind, today) {
  if (kind === 'day') return [today, today];
  if (kind === 'month') return [monthStart(today), today];
  return [weekStart(today), today];
}

// rank people on a metric. Calibrating people are listed but not ranked.
export function board(people, metric, from, to) {
  const m = METRICS[metric];
  const rows = people.map((p) => {
    const s = windowStats(p.series, from, to);
    const calibrating = to < p.series.calibration.unlocks;
    return { person: p, stats: s, value: s[m.key], calibrating, manual: s.manual };
  });
  const ranked = rows.filter((r) => r.value != null && !r.calibrating)
    .sort((a, b) => m.better === 'low' ? a.value - b.value : b.value - a.value);
  ranked.forEach((r, i) => { r.rank = i > 0 && ranked[i - 1].value === r.value ? ranked[i - 1].rank : i + 1; });
  const unranked = rows.filter((r) => !ranked.includes(r));
  return { metric: m, ranked, unranked };
}
