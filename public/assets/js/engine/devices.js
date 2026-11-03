// Device normalisation — the quiet part of "fair".
//
// Every brand measures the same body differently. We never compare brand
// scores (Whoop recovery, Body Battery, Readiness…). We take the raw signals
// every device shares and move them onto one reference scale before scoring.
//
// Reference scale = Garmin overnight values (chest-strap-validated, the most
// stable wrist readings in published comparisons).
//
// v0 offsets are starting estimates from published device comparisons. They are
// replaced over time by learnOffsets(): users who wear two devices on the same
// night give paired readings, and the median difference becomes the offset.
// See docs/SCORING.md §2.

export const DEVICES = {
  garmin: { name: 'Garmin',      hrv: 'rmssd', rhr: 'lowest 30-min avg, overnight', rhrOffset: 0,  sleepOffsetMin: 0 },
  whoop:  { name: 'Whoop',       hrv: 'rmssd', rhr: 'sleep, weighted to deep sleep', rhrOffset: +1, sleepOffsetMin: 0 },
  coros:  { name: 'Coros',       hrv: 'rmssd', rhr: 'overnight',                     rhrOffset: 0,  sleepOffsetMin: 0 },
  fitbit: { name: 'Fitbit',      hrv: 'rmssd', rhr: 'daytime + sleep model',         rhrOffset: -1, sleepOffsetMin: 0 },
  oura:   { name: 'Oura',        hrv: 'rmssd', rhr: 'lowest 5-min, overnight',       rhrOffset: +2, sleepOffsetMin: 0 },
  apple:  { name: 'Apple Watch', hrv: 'sdnn',  rhr: 'daytime at rest',               rhrOffset: -2, sleepOffsetMin: 0 },
  polar:  { name: 'Polar',       hrv: 'rmssd', rhr: 'overnight',                     rhrOffset: 0,  sleepOffsetMin: 0 },
  suunto: { name: 'Suunto',      hrv: 'rmssd', rhr: 'overnight',                     rhrOffset: 0,  sleepOffsetMin: 0 },
  manual: { name: 'Manual entry', hrv: null,   rhr: 'self-reported',                 rhrOffset: 0,  sleepOffsetMin: 0 },
};

// Apple reports SDNN, everyone else RMSSD. HRV is only ever scored against the
// person's own baseline (log scale), so the unit cancels out of every score.
// This factor exists only so profile charts show one unit.
const SDNN_TO_RMSSD = 0.8;

export function normaliseDaily(row, device) {
  const d = DEVICES[row.src || device] || DEVICES.garmin;
  const out = { ...row };
  if (row.rhr != null) out.rhr_n = row.rhr + d.rhrOffset;
  if (row.hrv != null) out.hrv_n = d.hrv === 'sdnn' ? row.hrv * SDNN_TO_RMSSD : row.hrv;
  if (row.sleep_h != null) out.sleep_n = row.sleep_h + d.sleepOffsetMin / 60;
  return out;
}

// Learn offsets from paired nights: [{device, refValue, devValue}] → {device: offset}
export function learnOffsets(pairs, minPairs = 10) {
  const by = {};
  for (const p of pairs) (by[p.device] ||= []).push(p.refValue - p.devValue);
  const out = {};
  for (const [dev, diffs] of Object.entries(by)) {
    if (diffs.length < minPairs) continue;
    diffs.sort((a, b) => a - b);
    out[dev] = Math.round(diffs[Math.floor(diffs.length / 2)] * 10) / 10;
  }
  return out;
}
