import { S, P, friendIds, isFriend, save, nowStamp, pendingRequests, history, myGroups, thisMonday } from '../store.js';
import { h2hState } from '../engine/awards.js';
import { METRICS, addDays, board, windowFor } from '../engine/scoring.js';
import { avatar, esc, fmt, fmtDate, toast, lineChart, cvar } from '../ui/components.js';
import { icon } from '../ui/icons.js';
import { query, rerender } from '../app.js';

const challenges = () => [...S.data.challenges.map((c) => ({ ...c, ...(S.local.chStatus?.[c.id] ? { status: S.local.chStatus[c.id] } : {}) })), ...S.local.challenges];
const H2H_METRICS = ['overall', 'recovery', 'load', 'sleep', 'consistency', 'steps'];

function h2hCard(c) {
  const st = h2hState(c, S.people, S.today), m = METRICS[c.metric];
  const side = (p, v) => `<div style="display:grid;justify-items:center;gap:6px;text-align:center">${avatar(p, { size: 'md', link: false })}<span style="font-weight:600;font-size:13px">${esc(p.id === S.me.id ? 'You' : p.first)}</span><span class="num big" style="font-size:30px;${st.lead === p.id ? `color:${cvar(m.color)}` : ''}">${fmt(v)}</span></div>`;
  const status = c.status === 'invite' && c.b === S.me.id ? `${esc(st.a.first)} challenged you` : c.status === 'sent' ? `Waiting for ${esc(st.b.first)} to accept` : st.done ? (st.lead ? `${esc(st.lead === S.me.id ? 'You' : P(st.lead).first)} won` : 'Draw') : `${st.daysLeft} day${st.daysLeft === 1 ? '' : 's'} left`;
  return `<a class="card" href="#/h2h/${c.id}"><div class="card-h"><span class="ic" style="--c:${cvar(m.color)}">${icon('vs')}</span><span class="t">${m.label}</span><span class="k">${status}</span></div>
    <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center">${side(st.a, st.va)}<span class="display" style="font-size:22px;color:var(--faint)">vs</span>${side(st.b, st.vb)}</div>
    <p class="sub" style="text-align:center">${esc(c.stake || 'Bragging rights')} · ${fmtDate(c.start)} to ${fmtDate(c.end)}</p></a>`;
}

export function h2hList() {
  const mine = challenges().filter((c) => c.a === S.me.id || c.b === S.me.id);
  const groupsOf = (k) => mine.filter((c) => k === 'done' ? S.today > c.end : S.today <= c.end);
  return {
    title: 'Head-to-head', back: '#/boards',
    html: `<div class="row between"><p class="sub" style="margin:0">Pick a friend, a board and a stake.</p><a class="btn sm" href="#/h2h/new">${icon('plus')}New challenge</a></div>
      <h2 class="sec"><span>Live</span></h2><div class="grid">${groupsOf('live').map((c) => `<div class="c6 wide">${h2hCard(c)}</div>`).join('') || '<p class="muted c12">No live challenges.</p>'}</div>
      <h2 class="sec"><span>Finished</span></h2><div class="grid">${groupsOf('done').map((c) => `<div class="c6 wide">${h2hCard(c)}</div>`).join('') || '<p class="muted c12">None yet.</p>'}</div>`,
  };
}

export function h2hNew() {
  const vs = query.get('vs') || '';
  const f = friendIds().map(P);
  return {
    title: 'New challenge', back: '#/h2h',
    html: `<form class="card" id="nh" style="max-width:600px">
      <label class="field"><span>Opponent</span><select class="select" name="b" required>${f.map((p) => `<option value="${p.id}" ${p.id === vs ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>
      <div class="field"><span>Board</span><div class="chips" style="flex-wrap:wrap">${H2H_METRICS.map((k, i) => `<button type="button" class="chip" data-m="${k}" aria-pressed="${i === 2}" style="--c:${cvar(METRICS[k].color)}"><span class="sw"></span>${METRICS[k].label}</button>`).join('')}</div>
        <small>Recovery and HRV are measured against each person's own normal, so any two people can go head-to-head.</small></div>
      <div class="field"><span>How long</span><div class="seg">${[[7, 'One week'], [14, 'Two weeks'], [28, 'Four weeks']].map(([d, l], i) => `<button type="button" data-d="${d}" aria-pressed="${i === 0}">${l}</button>`).join('')}</div><small>Starts this Monday, ${fmtDate(thisMonday())}.</small></div>
      <label class="field"><span>Stake</span><input class="input" name="stake" maxlength="60" placeholder="Loser buys coffee"></label>
      <button class="btn">Send challenge</button></form>`,
    mount(root) {
      const st = { m: 'load', d: 7 };
      root.addEventListener('click', (e) => {
        const m = e.target.closest('[data-m]'), d = e.target.closest('[data-d]');
        if (m) { st.m = m.dataset.m; root.querySelectorAll('[data-m]').forEach((b) => b.setAttribute('aria-pressed', b === m)); }
        if (d) { st.d = +d.dataset.d; root.querySelectorAll('[data-d]').forEach((b) => b.setAttribute('aria-pressed', b === d)); }
      });
      root.querySelector('#nh').addEventListener('submit', (e) => {
        e.preventDefault(); const f = e.target;
        const id = 'n' + Date.now().toString(36);
        S.local.challenges.push({ id, a: S.me.id, b: f.b.value, metric: st.m, start: thisMonday(), end: addDays(thisMonday(), st.d - 1), stake: f.stake.value.trim() || 'Bragging rights', status: 'sent' });
        save(); toast(`Challenge sent to ${P(f.b.value).first}`); location.hash = `#/h2h/${id}`;
      });
    },
  };
}

export function h2hView(id) {
  const c = challenges().find((x) => x.id === id);
  if (!c) return { title: 'Challenge', back: '#/h2h', html: '<div class="empty">This challenge no longer exists.</div>' };
  const st = h2hState(c, S.people, S.today), m = METRICS[c.metric];
  const days = []; for (let d = c.start; d <= (S.today < c.end ? S.today : c.end); d = addDays(d, 1)) days.push(d);
  const cum = m.key === 'tss';
  const line = (p) => { let run = 0; const rows = Object.fromEntries(p.series.rows.map((r) => [r.date, r])); return days.map((d) => { const r = rows[d]; let y = null;
    if (cum) { run += r?.tss || 0; y = run; } else if (c.metric === 'recovery') y = r?.recovery ?? null; else if (c.metric === 'sleep') y = r?.sleepScore ?? null; else if (c.metric === 'steps') y = r?.steps ?? null;
    else { const b = board([p], c.metric, c.start, d); y = b.ranked[0]?.value ?? null; } return { x: d, y }; }); };
  const invite = c.status === 'invite' && c.b === S.me.id;
  return {
    title: `${m.label} challenge`, back: '#/h2h',
    html: `${h2hCard(c).replace('<a class="card"', '<div class="card"').replace(/<\/a>$/, '</div>')}
      ${invite ? `<div class="row mt" style="gap:8px"><button class="btn" data-acc>Accept</button><button class="btn ghost" data-dec>Decline</button></div>` : ''}
      <div class="card mt">${lineChart([{ values: line(st.a), color: cvar(m.color), dots: true }, { values: line(st.b), color: 'var(--muted)', dash: '4 4', dots: true }], { h: 220, yLabel: m.label })}
      <p class="sub">${cum ? 'Running total of training stress.' : 'Day by day.'} Solid: ${esc(st.a.id === S.me.id ? 'you' : st.a.first)}. Dashed: ${esc(st.b.id === S.me.id ? 'you' : st.b.first)}.</p></div>`,
    mount(root) {
      root.addEventListener('click', (e) => {
        const acc = e.target.closest('[data-acc]'), dec = e.target.closest('[data-dec]'); if (!acc && !dec) return;
        (S.local.chStatus ||= {})[c.id] = acc ? 'active' : 'declined'; save();
        toast(acc ? 'Challenge accepted' : 'Challenge declined'); location.hash = '#/h2h';
      });
    },
  };
}

// ---------- friends ----------
export function friends() {
  const req = pendingRequests();
  const fr = friendIds().map(P);
  const others = Object.values(S.people).filter((p) => p.id !== S.me.id && !isFriend(p.id));
  return {
    title: 'Friends', back: `#/u/${S.me.id}`,
    html: `${req.length ? `<h2 class="sec" style="margin-top:0"><span>Requests</span></h2><div class="card"><div class="list">${req.map((r) => `<div class="li">${avatar(P(r.from), { size: 'sm' })}<span class="grow"><span class="ttl">${esc(P(r.from).name)}</span><span class="s">${esc(P(r.from).identity)} · ${esc(P(r.from).town || '')}</span></span><button class="btn sm" data-acc="${r.from}">Accept</button><button class="btn ghost sm" data-dec="${r.from}">Decline</button></div>`).join('')}</div></div>` : ''}
      <h2 class="sec"${req.length ? '' : ' style="margin-top:0"'}><span>Your friends</span><span class="sub" style="margin:0">${fr.length}</span></h2>
      <div class="card"><div class="list">${fr.map((p) => `<div class="li">${avatar(p, { size: 'sm' })}<a class="grow" href="#/u/${p.id}"><span class="ttl">${esc(p.name)}</span><span class="s">${esc(p.identity)}</span></a><a class="iconbtn" href="#/dm/${p.id}" aria-label="Message ${esc(p.first)}">${icon('chat')}</a><a class="iconbtn" href="#/h2h/new?vs=${p.id}" aria-label="Challenge ${esc(p.first)}">${icon('vs')}</a></div>`).join('')}</div></div>
      <h2 class="sec"><span>Find people</span></h2>
      <input class="input" type="search" id="q" placeholder="Search by name or town" aria-label="Search people">
      <div class="card mt"><div class="list" id="pl">${others.map((p) => `<div class="li" data-n="${esc((p.name + ' ' + (p.town || '')).toLowerCase())}">${avatar(p, { size: 'sm' })}<a class="grow" href="#/u/${p.id}"><span class="ttl">${esc(p.name)}</span><span class="s">${esc(p.identity)} · ${esc(p.town || '')}</span></a><button class="btn ghost sm" data-add="${p.id}">Add friend</button></div>`).join('')}</div></div>
      <p class="sub mt">Friendship is two-way: both people accept before workouts, heart rate and sleep detail are shared, and only friends can message each other.</p>`,
    mount(root) {
      root.querySelector('#q').addEventListener('input', (e) => { const q = e.target.value.toLowerCase(); root.querySelectorAll('#pl .li').forEach((li) => { li.hidden = !li.dataset.n.includes(q); }); });
      root.addEventListener('click', (e) => {
        const a = e.target.closest('[data-acc]'), d = e.target.closest('[data-dec]'), add = e.target.closest('[data-add]');
        if (a) { S.local.friends.push(a.dataset.acc); save(); toast('You are now friends'); rerender(); }
        if (d) { (S.local.declined ||= []).push(d.dataset.dec); save(); rerender(); }
        if (add) { add.outerHTML = '<span class="tag">Request sent</span>'; toast('Friend request sent'); }
      });
    },
  };
}

// ---------- messages ----------
const thread = (id) => [...(S.data.dms[id] || []), ...(S.local.dms[id] || [])];
export function inbox() {
  const fr = friendIds().map(P).map((p) => ({ p, t: thread(p.id) })).sort((a, b) => (b.t.at(-1)?.at || '').localeCompare(a.t.at(-1)?.at || ''));
  return {
    title: 'Messages', back: '#/home',
    html: `<div class="card"><div class="list">${fr.map(({ p, t }) => `<a class="li" href="#/dm/${p.id}">${avatar(p, { size: 'md', link: false })}<span class="grow"><span class="ttl">${esc(p.name)}</span><span class="s">${t.length ? esc((t.at(-1).from === S.me.id ? 'You: ' : '') + t.at(-1).text) : 'Say hello'}</span></span>${t.length ? `<span class="sub" style="margin:0">${fmtDate(t.at(-1).at.slice(0, 10))}</span>` : ''}</a>`).join('')}</div></div>
      <p class="sub mt">You can message friends. Add someone as a friend first to start a conversation.</p>`,
  };
}
export function dm(id) {
  const p = P(id);
  if (!p || !isFriend(id)) return { title: 'Messages', back: '#/messages', html: `<div class="empty card">${icon('lock')}<p>You can only message friends. Send ${esc(p?.first || 'them')} a friend request first.</p></div>` };
  return {
    title: p.name, back: '#/messages', keepScroll: true,
    html: `<div class="chat" id="chat">${thread(id).map((m) => `<div class="msg ${m.from === S.me.id ? 'mine' : ''}">${m.from === S.me.id ? '' : avatar(p, { size: 'sm' })}<div><div class="bub">${esc(m.text)}</div></div></div>`).join('') || `<p class="muted" style="text-align:center">Start the conversation with ${esc(p.first)}.</p>`}</div>
      <form class="composer" id="cmp"><input class="input" name="t" placeholder="Message ${esc(p.first)}" aria-label="Message" autocomplete="off"><button class="btn" aria-label="Send">${icon('send')}</button></form>`,
    mount(root) {
      window.scrollTo(0, document.body.scrollHeight);
      const f = root.querySelector('#cmp');
      f.addEventListener('submit', (e) => { e.preventDefault(); const t = f.t.value.trim(); if (!t) return; (S.local.dms[id] ||= []).push({ from: S.me.id, text: t, at: nowStamp() }); save(); root.querySelector('#chat').insertAdjacentHTML('beforeend', `<div class="msg mine"><div><div class="bub">${esc(t)}</div></div></div>`); f.reset(); window.scrollTo(0, document.body.scrollHeight); });
    },
  };
}

// ---------- notifications ----------
export function notifications() {
  const n = S.settings.notify, out = [];
  const lastSun = addDays(thisMonday(), -1);
  for (const g of myGroups()) {
    const last = history(g.id)[0];
    if (n.champions && last) { const mine = Object.values(last.champions).filter((c) => c.winner.id === S.me.id); out.push({ at: lastSun + 'T18:00', ic: 'trophy', text: mine.length ? `You won ${mine.map((c) => c.award.short.toLowerCase()).join(' and ')} in ${g.name}` : `${g.name} champions are in`, href: `#/g/${g.id}/chat` }); }
  }
  if (n.overtaken) {
    const [f, t] = windowFor('week', S.today);
    const now = board([S.me, ...friendIds().map(P)], 'load', f, t), before = board([S.me, ...friendIds().map(P)], 'load', f, addDays(t, -1));
    const r1 = now.ranked.find((r) => r.person.id === S.me.id), r0 = before.ranked.find((r) => r.person.id === S.me.id);
    if (r1 && r0 && r1.rank > r0.rank) { const by = now.ranked[r1.rank - 2]?.person; out.push({ at: S.today + 'T08:00', ic: 'bolt', text: `${by ? by.first : 'A friend'} passed you on the load board`, href: '#/boards/load' }); }
  }
  if (n.requests) for (const r of pendingRequests()) out.push({ at: r.at, ic: 'user', text: `${P(r.from).name} sent you a friend request`, href: '#/friends' });
  if (n.h2h) for (const c of challenges().filter((c) => c.status === 'invite' && c.b === S.me.id)) out.push({ at: S.today + 'T07:30', ic: 'vs', text: `${P(c.a).first} challenged you on ${METRICS[c.metric].label.toLowerCase()}`, href: `#/h2h/${c.id}` });
  if (n.morning) { const t = S.me.series.rows.at(-1); out.push({ at: S.today + 'T07:00', ic: 'gauge', text: `Recovery ${t.recovery ?? '–'}% this morning`, href: `#/u/${S.me.id}/m/recovery` }); }
  if (n.chat) out.push({ at: S.today + 'T08:05', ic: 'chat', text: 'New messages in Sunday Club', href: '#/g/lads/chat' });
  out.sort((a, b) => b.at.localeCompare(a.at));
  S.local.read.notifications = true; save();
  return {
    title: 'Notifications', back: '#/home', actions: `<a class="iconbtn" href="#/settings#notify" aria-label="Notification settings">${icon('settings')}</a>`,
    html: `<div class="card"><div class="list">${out.map((x) => `<a class="li" href="${x.href}"><span class="iconbtn" style="pointer-events:none">${icon(x.ic)}</span><span class="grow"><span class="ttl" style="white-space:normal">${esc(x.text)}</span><span class="s">${x.at.slice(0, 10) === S.today ? 'Today' : fmtDate(x.at.slice(0, 10), { weekday: 'short', day: 'numeric', month: 'short' })} ${x.at.slice(11)}</span></span></a>`).join('') || '<p class="muted">Nothing new. Choose what you hear about in Settings.</p>'}</div></div>`,
  };
}
