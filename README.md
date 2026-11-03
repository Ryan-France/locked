# Locked (working title)

Compete with friends on recovery, training load and sleep, whatever watch you wear. Whoop-style boards and groups, weekly champions, head-to-heads, badges and DGD-style profiles, with every brand's data put on one fair scale.

## Run it

```
cd public && python3 -m http.server 8000      # open http://localhost:8000
```

No build step: plain HTML, CSS and ES modules, like dontgetdropped.app. Deploys to Cloudflare Pages with `public/` as the output folder.

## What's in the preview

- **You** are Ryan, on real Garmin data copied from the DGD repo (`scripts/ryan/`, June → 3 Nov 2026).
- **Friends** are made up: Cian (Whoop, powerlifter), Aoife (Coros, marathoner), Seán (Fitbit, five-a-side, some manual entries), Niamh (Oura, climber), Darragh (Apple Watch, cyclist, HRV in SDNN) and Ellie (Garmin, day 6 of calibration). Each device "reads" a true physiology the way that brand does, so the normalisation has real work to undo. 18 more people fill the public groups.
- Everything you do (messages, kudos, groups, settings, manual workouts) is saved in your browser only. Settings → Reset clears it.
- Rebuild demo data: `python3 scripts/make_demo.py [YYYY-MM-DD]`.

## Map

| Path | What |
|---|---|
| `public/assets/js/engine/` | Scoring: device normalisation, hrTSS, CTL/ATL/TSB, recovery, sleep, boards, champions, badges, DOTS. Pure functions shared with the Worker. |
| `public/assets/js/views/` | Screens: home, boards, feed, groups, group (board/chat/champions/members), profile + deep dives, head-to-head, friends, messages, notifications, records, badges, devices, log workout, settings. |
| `public/assets/css/themes.css` | Five looks (Grit, Minimal, Playful, Sporty, Data-dense) × dark/light. |
| `docs/SCORING.md` | Every formula and fairness rule. |
| `worker/` | Cloudflare Worker + D1 schema skeleton: webhooks, API, Sunday 18:00 champions cron. |

## Next steps

1. Real accounts (magic link) and the Worker on Cloudflare free tier.
2. Data: Ryan's Garmin data via the existing DGD sync; apply to the Garmin Connect Developer Program. Whoop, Oura, Polar, Fitbit and Strava have open developer sign-up and can be wired directly for free. Aggregators (Terra, ROOK, Thryve, Spike) start around $300–500 a month, so they make sense at public launch, not for the friends beta. Apple Watch needs a native iOS app.
3. Tune coefficients (strength factor, load curve, device offsets) on the first month of real friend data.
