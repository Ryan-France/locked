// Locked API — Cloudflare Worker skeleton (not deployed yet).
// Serves /api/* from D1, receives device webhooks, and crowns weekly
// champions on a cron. Scoring reuses the exact engine the app runs.

import { buildSeries, weekStart, addDays } from '../public/assets/js/engine/scoring.js';
import { weekChampions } from '../public/assets/js/engine/awards.js';
import { ADAPTERS } from './adapters.js';

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

async function loadPerson(env, id, since) {
  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
  const daily = (await env.DB.prepare('SELECT * FROM daily WHERE user_id = ? AND date >= ? ORDER BY date').bind(id, since).all()).results;
  const acts = (await env.DB.prepare('SELECT * FROM activities WHERE user_id = ? AND date >= ? ORDER BY date').bind(id, since).all()).results;
  const prim = await env.DB.prepare('SELECT provider FROM connections WHERE user_id = ? AND primary_source = 1').bind(id).first();
  return { ...user, device: prim?.provider || 'garmin', max_hr: user.max_hr, bodyweight: user.bodyweight_kg,
    daily: pickPrimary(daily, prim?.provider), activities: acts.map((a) => ({ ...a, sets: a.sets ? JSON.parse(a.sets) : null, manual: !!a.manual })) };
}
// one row per night: the primary device wins, others are kept for offset learning
function pickPrimary(rows, primary) {
  const by = {};
  for (const r of rows) if (!by[r.date] || r.src === primary) by[r.date] = r;
  return Object.values(by);
}

const todayDublin = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Dublin' }).format(new Date());

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const user = await authenticate(req, env);

    // device webhooks (no user session; verified per provider)
    const hook = url.pathname.match(/^\/api\/webhooks\/(\w+)$/);
    if (hook && req.method === 'POST') {
      const ad = ADAPTERS[hook[1]];
      if (!ad || !(await ad.verify(req.clone(), env))) return json({ error: 'unknown or unverified' }, 401);
      const { daily = [], activities = [] } = ad.normalise(await req.json());
      const stmts = [
        ...daily.map((d) => env.DB.prepare('INSERT OR REPLACE INTO daily (user_id,date,src,rhr,hrv,sleep_h,bed_min_after_18,steps) VALUES (?,?,?,?,?,?,?,?)')
          .bind(d.user_id, d.date, hook[1], d.rhr, d.hrv, d.sleep_h, d.bed_min_after_18, d.steps)),
        ...activities.map((a) => env.DB.prepare('INSERT OR REPLACE INTO activities (id,user_id,src,external_id,date,time,sport,type,name,minutes,km,avg_hr,max_hr,z1_min,z2_min,z3_min,z4_min,z5_min) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
          .bind(`${hook[1]}-${a.external_id}`, a.user_id, hook[1], a.external_id, a.date, a.time, a.sport, a.type, a.name, a.minutes, a.km, a.avg_hr, a.max_hr, a.z1_min, a.z2_min, a.z3_min, a.z4_min, a.z5_min)),
      ];
      if (stmts.length) await env.DB.batch(stmts);
      return json({ ok: true, daily: daily.length, activities: activities.length });
    }

    if (!user) return json({ error: 'sign in' }, 401);

    if (url.pathname === '/api/me') return json(await loadPerson(env, user.id, addDays(todayDublin(), -120)));

    const gb = url.pathname.match(/^\/api\/groups\/([\w-]+)\/members$/);
    if (gb) {
      const ok = await env.DB.prepare('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?').bind(gb[1], user.id).first();
      if (!ok) return json({ error: 'not a member' }, 403);
      // Scores only: raw HR/HRV/sleep detail goes out only to accepted friends (see /api/u/:id).
      return json({ todo: 'return per-member window stats computed with windowStats()' });
    }
    return json({ error: 'not found' }, 404);
  },

  // Runs every Sunday 17:00 and 18:00 UTC; acts only when it is 18:00 in Dublin (handles summer time).
  async scheduled(event, env) {
    const hour = +new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Dublin', hour: '2-digit', hour12: false }).format(new Date());
    if (hour !== 18) return;
    const today = todayDublin(), monday = weekStart(today);
    const groups = (await env.DB.prepare('SELECT id FROM groups').all()).results;
    for (const g of groups) {
      const ids = (await env.DB.prepare('SELECT user_id FROM group_members WHERE group_id = ?').bind(g.id).all()).results.map((r) => r.user_id);
      const people = await Promise.all(ids.map(async (id) => { const p = await loadPerson(env, id, addDays(today, -60)); p.series = buildSeries(p, today); return p; }));
      const ch = weekChampions(people, monday);
      const stmts = Object.values(ch).map((c) => env.DB.prepare('INSERT OR REPLACE INTO champions VALUES (?,?,?,?,?)').bind(g.id, monday, c.id, c.winner.id, c.value));
      stmts.push(env.DB.prepare("INSERT INTO messages (group_id, kind, body) VALUES (?, 'champions', ?)").bind(g.id, JSON.stringify({ week: monday, winners: Object.fromEntries(Object.values(ch).map((c) => [c.id, c.winner.id])) })));
      await env.DB.batch(stmts);
      // TODO: push notifications to members who have "Weekly champions" switched on
    }
  },
};

async function authenticate(req, env) {
  // TODO: Cloudflare Access or magic-link sessions. Until then, a signed cookie like DGD's PIN gate.
  return null;
}
