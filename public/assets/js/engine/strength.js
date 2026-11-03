// Strength balancing: DOTS (the IPF-era standard used by OpenPowerlifting and
// most federations) on estimated one-rep maxes, so a 92 kg lifter and a 68 kg
// lifter are compared on strength per body size, not raw kilos.

const COEF = {
  open:   [-0.0000010930, 0.0007391293, -0.1918759221, 24.0900756, -307.75076],
  female: [-0.0000010706, 0.0005158568, -0.1126655495, 13.6175032, -57.96288],
};

// Product decision: no sex or age balancing by default, so everyone uses the
// "open" curve. The female curve is kept so it can be switched on later.
export function dots(totalKg, bodyweightKg, curve = 'open') {
  if (!totalKg || !bodyweightKg) return null;
  const [a, b, c, d, e] = COEF[curve] || COEF.open;
  const bw = Math.min(Math.max(bodyweightKg, 40), curve === 'female' ? 150 : 210);
  const denom = a * bw ** 4 + b * bw ** 3 + c * bw ** 2 + d * bw + e;
  return Math.round((totalKg * 500 / denom) * 10) / 10;
}

// Epley estimate, only trusted up to 10 reps.
export function e1rm(kg, reps) {
  if (!kg || !reps || reps > 10) return null;
  return reps === 1 ? kg : kg * (1 + reps / 30);
}

export const BIG3 = ['squat', 'bench', 'deadlift'];

// Best e1RM per lift over the window → { lifts: {squat: kg…}, total, n, dots }
export function strengthSummary(activities, bodyweightKg, fromDate) {
  const best = {};
  for (const a of activities) {
    if (!a.sets || (fromDate && a.date < fromDate)) continue;
    for (const s of a.sets) {
      if (!BIG3.includes(s.lift)) continue;
      const v = e1rm(s.kg, s.reps);
      if (v && v > (best[s.lift] || 0)) best[s.lift] = v;
    }
  }
  const lifts = Object.fromEntries(Object.entries(best).map(([k, v]) => [k, Math.round(v * 2) / 2]));
  const total = Object.values(lifts).reduce((s, v) => s + v, 0);
  const n = Object.keys(lifts).length;
  return { lifts, total, n, dots: n ? dots(total, bodyweightKg) : null };
}
