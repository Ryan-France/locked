# Locked scoring spec (v0.1)

Everything here is implemented in `public/assets/js/engine/` (pure JS, shared by the app and the Worker). Users never see the coefficients; the in-app "How scores work" page explains the principles only.

## 1. Principles

1. **Never compare brand scores.** Whoop recovery, Garmin Body Battery, Oura readiness and Fitbit readiness use secret formulas that can't be reverse-engineered reliably. Locked ignores them and scores from the raw signals every device shares: overnight resting HR, overnight HRV, sleep duration and bedtime, steps, and per-workout duration and heart rate.
2. **Personal where bodies differ, raw where they don't.**
   - Compared against the person's own baseline: Recovery, HRV trend.
   - Compared raw: Sleep, Training load, Fitness (CTL), Resting HR, Steps, Consistency.
3. **Missing data is excluded, never zero.** A day without readings drops out of that week's averages. Days without workouts are 0 load (that's real).
4. **14-day calibration.** Baselines, resting HR and max HR are learned first. The person is listed as "Calibrating, day n of 14" and unranked until `first day + 14`.
5. **No sex or age balancing** (product decision, 3 Nov 2026). Age is only used to estimate max HR when the person hasn't given one.

## 2. Device normalisation (`devices.js`)

Reference scale: Garmin overnight values.

| Device | HRV metric | RHR offset (added) |
|---|---|---|
| Garmin, Coros, Polar, Suunto | RMSSD | 0 |
| Whoop | RMSSD | +1 |
| Fitbit | RMSSD | −1 |
| Oura | RMSSD | +2 |
| Apple Watch | **SDNN** (× 0.8 for display only) | −2 |

These v0 offsets are starting estimates from published comparisons (e.g. Oura reads ~5 bpm lower RHR than Fitbit). They are replaced by `learnOffsets()`: anyone wearing two devices produces paired nights, and the median difference per device becomes the offset once a device has ≥10 pairs. HRV needs no offset because it's only ever scored on a log scale against the person's own baseline, so units cancel.

## 3. Training stress (`sessionStress`)

Same as dontgetdropped.app:

- Run, bike, anything with HR: `IF = clamp((avgHR − RHR) / (LTHR − RHR), 0, 1.1)`, `TSS = hours × IF² × 100`
- Swim: `hours × 56.25` (IF 0.75). No HR: `hours × 30`.
- **Strength: × 1.3.** HR under-reads lifting (short sets, long rests). Tune with real data.

Physiology when not supplied: RHR = median of the first 14 days; max HR = max(highest seen, 208 − 0.7 × age), capped at 210; LTHR = RHR + 0.86 × (max HR − RHR). Ryan's own values (RHR 54, LTHR 182, max 195) come from his lab test.

Fitness/fatigue/form exactly as DGD: `CTL += (TSS − CTL)/42`, `ATL += (TSS − ATL)/7`, `TSB = CTL − ATL`.

## 4. Daily scores

**Recovery (0–100, personal).** Baseline = previous 30 days of the person's own readings (needs ≥7).

```
zHRV   = (ln HRV − mean ln HRV) / max(sd, 0.05)        clamp ±3
zRHR   = (mean RHR − RHR) / max(sd, 1.5)               clamp ±3
zSleep = hours − 8                                      clamp ±2
z      = weighted mean (0.55, 0.25, 0.20), re-weighted when a part is missing
Recovery = 100 / (1 + e^−(1.15z + 0.55))                → 63 on a normal day
```
Green ≥ 67, yellow 34–66, red < 34 (Whoop-style bands).

**Sleep (0–100, raw).** `100 × (0.75 × min(1, hours / 8) + 0.25 × regularity)`, regularity = `1 − min(1, sd(bedtime over 7 nights) / 90 min)`.

## 5. Window scores (today / week / month)

- **Load score** = `100 × (1 − e^(−weekly-equivalent TSS / 350))` — diminishing returns so a 15-hour Ironman week doesn't bury a 6-hour week completely.
- **Overall** = `0.35 × Recovery + 0.35 × Load score + 0.30 × Sleep`, re-weighted if one is missing; needs at least two parts.
- **Consistency** = active days / ⌈days × 6/7⌉, capped at 100%. Active = TSS ≥ 15 or ≥ 10,000 steps.
- **HRV trend** = mean % above/below the 30-day baseline.

## 6. Weekly champions (`awards.js`)

Week = Monday–Sunday, announced Sunday 18:00 Europe/Dublin, per group. Recovery (avg), Training load (total TSS), Sleep (avg score), Consistency. Tie-breaks: nights measured, hours, sleep hours, TSS. Recovery and sleep need ≥4 nights in the week. Calibrating members can't win. Winners wear a halo in that group's colour for the following week (recovery mint, load ember, sleep blue, consistency violet; several titles = segmented ring).

## 7. Strength (`strength.js`)

Best estimated 1RM per lift (Epley, sets of ≤10 reps) over 90 days, summed, then **DOTS** with the open curve for everyone (female curve kept but off, per the no-sex-balancing decision).

## 8. Manual entries

Count normally, flagged with a "Manual" badge on boards and posts; tapping it explains. Manual workouts without HR use `hours × 30`.

## 9. Open questions / to tune with real data

- Device offsets → replace with learned values once paired nights exist.
- Strength × 1.3 and LOAD_HALF 350 → check against the first month of real friend data.
- Sleep target is 8 h for everyone; could become personal later (but sleep is a raw board by decision).
- Champion timing assumes the week's data has synced by Sunday 18:00; late syncs for Sunday-afternoon sessions may need a grace window.
