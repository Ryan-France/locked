import { S, P, group, history, scopeHalos, save, nowStamp, isFriend, thisMonday } from '../store.js';
import { weekChampions, cabinet, AWARDS } from '../engine/awards.js';
import { addDays, METRICS } from '../engine/scoring.js';
import { avatar, esc, fmt, fmtDate, toast, cvar, info, sheet } from '../ui/components.js';
import { icon } from '../ui/icons.js';
import { renderBoard, UI as BUI } from './boards.js';
import { gIcon, G_ICONS, G_COLORS } from './groups.js';
import { countdownText } from './home.js';
import { strengthBoard } from './more.js';
import { rerender } from '../app.js';

const GUI = { win: 'week', metric: 'overall' };
const TABS = [['board', 'Board'], ['chat', 'Chat'], ['champions', 'Champions'], ['members', 'Members']];

function announcement(wk) {
  const end = addDays(wk.week, 6);
  return `<div class="announce"><div class="a-h"><span class="display" style="font-size:20px">Week of ${fmtDate(wk.week)}</span><span class="lbl">Champions</span></div>
    <div class="wins">${Object.values(wk.champions).map((c) => `<a class="win" href="#/u/${c.winner.id}" style="--c:${cvar(c.award.color)}">${avatar(c.winner, { size: 'sm', halo: [c.id], link: false })}
      <span class="grow"><span class="aw">${c.award.short}</span><br><span class="wn">${esc(c.winner.id === S.me.id ? 'You' : c.winner.first)}</span></span>
      <span class="num">${c.value}${c.id === 'recovery' || c.id === 'consistency' ? '%' : ''}</span></a>`).join('')}</div>
    <p class="sub">Announced ${fmtDate(end, { weekday: 'short', day: 'numeric', month: 'short' })} at 18:00. Rings show until next Sunday.</p></div>`;
}

function chatItems(g) {
  const msgs = [...(S.data.chats[g.id] || []), ...(S.local.chats[g.id] || [])].map((m) => ({ ...m, t: 'msg' }));
  const ann = history(g.id).slice(0, 4).map((wk) => ({ at: addDays(wk.week, 6) + 'T18:00', t: 'ann', wk }));
  return [...msgs, ...ann].sort((a, b) => a.at.localeCompare(b.at));
}

function chatHtml(g) {
  let lastDay = '';
  return chatItems(g).map((m) => {
    const day = m.at.slice(0, 10);
    const sep = day !== lastDay ? `<div class="day-sep">${day === S.today ? 'Today' : fmtDate(day, { weekday: 'long', day: 'numeric', month: 'short' })}</div>` : '';
    lastDay = day;
    if (m.t === 'ann') return sep + announcement(m.wk);
    const p = P(m.from), mine = m.from === S.me.id;
    return `${sep}<div class="msg ${mine ? 'mine' : ''}">${mine ? '' : avatar(p, { size: 'sm', halo: scopeHalos(g.id)[p.id] || [] })}<div>${mine ? '' : `<div class="who">${esc(p.first)} · ${m.at.slice(11)}</div>`}<div class="bub">${esc(m.text)}</div></div></div>`;
  }).join('');
}

function streaks(hist) {
  const s = {};
  for (const id of new Set(hist.flatMap((w) => Object.values(w.champions).map((c) => c.winner.id)))) {
    let n = 0; for (const w of hist) { if (Object.values(w.champions).some((c) => c.winner.id === id)) n++; else break; }
    s[id] = n;
  }
  return s;
}

export function view(id, tab = 'board') {
  const g = group(id);
  if (!g) return { title: 'Group not found', back: '#/groups', html: `<div class="empty">This group doesn't exist or you no longer have access.<br><a class="btn" href="#/groups">Back to groups</a></div>` };
  const member = g.members.includes(S.me.id), admin = g.admins.includes(S.me.id);
  if (!member && g.privacy === 'private') return { title: g.name, back: '#/groups', html: `<div class="empty card">${icon('lock')}<p>This is a private group. Ask a member for an invite link.</p></div>` };
  const hist = history(g.id);

  const head = `<div class="row" style="gap:16px;margin:6px 0 16px">${gIcon(g, 'lg')}<div style="min-width:0;flex:1"><h2 class="display" style="font-size:clamp(26px,4.4vw,44px)">${esc(g.name)}</h2>
    <p class="sub" style="margin-top:6px">${g.privacy === 'public' ? icon('globe', 'vh') + 'Public' : 'Private'} group · ${g.members.length} members${g.desc ? ' · ' + esc(g.desc) : ''}</p></div>
    ${member ? '' : `<button class="btn" data-join>Join</button>`}</div>
    <nav class="seg" aria-label="Group sections" style="margin-bottom:16px">${TABS.map(([k, l]) => `<a href="#/g/${g.id}/${k}" ${tab === k ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>`;

  let body = '';
  if (tab === 'board') {
    const chips = ['overall', 'recovery', 'load', 'sleep', 'consistency', 'fitness', 'rhr', 'hrv', 'steps', 'strength'];
    body = `<div class="row between" style="flex-wrap:wrap;gap:8px"><div class="seg">${[['day', 'Today'], ['week', 'This week'], ['month', 'This month']].map(([k, l]) => `<button data-win="${k}" aria-pressed="${GUI.win === k}">${l}</button>`).join('')}</div>
      <span class="sub" style="margin:0">Champions in ${countdownText()}</span></div>
      <div class="chips mt">${chips.map((k) => `<button class="chip" data-metric="${k}" aria-pressed="${GUI.metric === k}" style="--c:${k === 'strength' ? 'var(--violet)' : cvar(METRICS[k].color)}"><span class="sw"></span>${k === 'strength' ? 'Strength' : METRICS[k].label}</button>`).join('')}</div>
      <div class="mt">${GUI.metric === 'strength' ? strengthBoard(g.members.map(P), g.id) : renderBoard({ scope: g.id, metric: GUI.metric, win: GUI.win })}</div>`;
  } else if (tab === 'chat') {
    body = member ? `<div class="chat" id="chat">${chatHtml(g)}</div>
      <form class="composer" id="cmp"><input class="input" name="t" placeholder="Message ${esc(g.name)}" aria-label="Message" autocomplete="off" maxlength="500"><button class="btn" aria-label="Send">${icon('send')}</button></form>`
      : `<div class="empty card">Join the group to read and post in the chat.</div>`;
  } else if (tab === 'champions') {
    const live = weekChampions(g.members.map(P), thisMonday());
    const cab = cabinet(hist), st = streaks(hist);
    body = `<div class="card"><div class="card-h"><span class="ic" style="--c:var(--brand-ink)">${icon('trophy')}</span><span class="t">Leading this week</span><span class="k">Crowned in ${countdownText()}</span>${info('champions')}</div>
      <div class="wins">${Object.values(AWARDS).map((aw) => { const c = live[Object.keys(AWARDS).find((k) => AWARDS[k] === aw)]; return c ? `<a class="win" href="#/u/${c.winner.id}" style="--c:${cvar(aw.color)}">${avatar(c.winner, { size: 'sm', link: false })}<span class="grow"><span class="aw">${aw.short}</span><br><span class="wn">${esc(c.winner.id === S.me.id ? 'You' : c.winner.first)}</span></span><span class="num">${c.value}</span></a>` : `<div class="win" style="--c:${cvar(aw.color)}"><span class="grow"><span class="aw">${aw.short}</span><br><span class="wn muted">Not enough data yet</span></span></div>`; }).join('')}</div></div>
      <h2 class="sec"><span>Award cabinet</span></h2>
      <div class="card tscroll"><table class="t"><thead><tr><th>Member</th>${Object.values(AWARDS).map((a) => `<th class="n" style="color:${cvar(a.color)}">${a.short}</th>`).join('')}<th class="n">Total</th><th class="n">Streak</th></tr></thead>
        <tbody>${cab.map((e) => `<tr><td><a class="row" style="gap:8px" href="#/u/${e.person.id}">${avatar(e.person, { size: 'xs', link: false })}${esc(e.person.id === S.me.id ? 'You' : e.person.first)}</a></td>${Object.keys(AWARDS).map((k) => `<td class="n">${e[k] || '–'}</td>`).join('')}<td class="n"><b>${e.total}</b></td><td class="n">${st[e.person.id] ? st[e.person.id] + ' wk' : '–'}</td></tr>`).join('') || `<tr><td colspan="7" class="muted">No champions yet.</td></tr>`}</tbody></table></div>
      <h2 class="sec"><span>Past weeks</span></h2><div class="stack">${hist.map(announcement).join('')}</div>`;
  } else {
    const link = `${location.origin}${location.pathname}#/g/${g.id}?invite=${g.id.slice(0, 3)}${g.members.length}x`;
    body = `<div class="row" style="gap:8px;flex-wrap:wrap">${member ? `<button class="btn sm" data-copy="${esc(link)}">${icon('link')}Copy invite link</button>` : ''}${admin ? `<button class="btn ghost sm" data-edit>${icon('edit')}Edit group</button>` : ''}${member && !admin ? `<button class="btn ghost sm" data-leave>Leave group</button>` : ''}</div>
      <div class="card mt"><div class="list">${g.members.map(P).filter(Boolean).map((p) => `<div class="li">${avatar(p, { size: 'sm', halo: scopeHalos(g.id)[p.id] || [] })}<a class="grow" href="#/u/${p.id}"><span class="ttl">${esc(p.id === S.me.id ? 'You' : p.name)}</span><span class="s">${esc(p.identity || '')}${g.admins.includes(p.id) ? ' · Admin' : ''}</span></a>
        ${p.id !== S.me.id && !isFriend(p.id) ? `<button class="btn ghost sm" data-addf="${p.id}">Add friend</button>` : ''}${admin && p.id !== S.me.id ? `<button class="iconbtn" data-remove="${p.id}" aria-label="Remove ${esc(p.first)}">${icon('x')}</button>` : ''}</div>`).join('')}</div></div>`;
  }

  return {
    title: g.name, back: '#/groups', html: head + body, keepScroll: tab === 'chat',
    mount(root) {
      const chat = root.querySelector('#chat');
      if (chat) window.scrollTo(0, document.body.scrollHeight);
      root.addEventListener('click', (e) => {
        const w = e.target.closest('[data-win]'), m = e.target.closest('[data-metric]');
        if (w) { GUI.win = w.dataset.win; return rerender(); }
        if (m) { GUI.metric = m.dataset.metric; return rerender(); }
        if (e.target.closest('[data-join]')) { S.local.joined.push(g.id); S.local.left = S.local.left.filter((x) => x !== g.id); save(); S._hist = {}; toast('Joined'); return rerender(); }
        const c = e.target.closest('[data-copy]');
        if (c) { navigator.clipboard?.writeText(c.dataset.copy).then(() => toast('Invite link copied'), () => toast('Copy failed. Long-press to copy.')); return; }
        if (e.target.closest('[data-leave]')) { S.local.left.push(g.id); S.local.joined = S.local.joined.filter((x) => x !== g.id); save(); S._hist = {}; toast('You left the group'); location.hash = '#/groups'; return; }
        const a = e.target.closest('[data-addf]');
        if (a) { a.outerHTML = '<span class="tag">Request sent</span>'; toast('Friend request sent'); return; }
        const r = e.target.closest('[data-remove]');
        if (r) { const lg = S.local.groups.find((x) => x.id === g.id); if (lg) { lg.members = lg.members.filter((x) => x !== r.dataset.remove); save(); rerender(); } else toast('Demo groups can\'t be changed yet'); return; }
        if (e.target.closest('[data-edit]')) editSheet(g);
      });
      const cmp = root.querySelector('#cmp');
      cmp?.addEventListener('submit', (e) => {
        e.preventDefault(); const t = cmp.t.value.trim(); if (!t) return;
        (S.local.chats[g.id] ||= []).push({ from: S.me.id, text: t, at: nowStamp() }); save();
        chat.insertAdjacentHTML('beforeend', `<div class="msg mine"><div><div class="bub">${esc(t)}</div></div></div>`);
        cmp.reset(); window.scrollTo(0, document.body.scrollHeight);
      });
    },
  };
}

function editSheet(g) {
  const local = S.local.groups.find((x) => x.id === g.id);
  sheet(`<h3>Edit group</h3>${local ? '' : '<p>Changes to demo groups are kept on this device only.</p>'}
    <form id="eg"><label class="field"><span>Name</span><input class="input" name="name" value="${esc(g.name)}" maxlength="40"></label>
    <label class="field"><span>Description</span><textarea class="input" name="desc" rows="2" maxlength="160">${esc(g.desc || '')}</textarea></label>
    <div class="field"><span>Icon</span><div class="chips" style="flex-wrap:wrap">${G_ICONS.map((i) => `<button type="button" class="chip" data-i="${i}" aria-pressed="${g.icon === i}" aria-label="${i}">${icon(i)}</button>`).join('')}</div></div>
    <div class="field"><span>Colour</span><div class="chips" style="flex-wrap:wrap">${G_COLORS.map((c) => `<button type="button" class="chip" data-c="${c}" aria-pressed="${g.color === c}" aria-label="${c}"><span class="sw" style="--c:${c === 'brand' ? 'var(--brand-ink)' : cvar(c)};width:14px;height:14px"></span></button>`).join('')}</div></div>
    <button class="btn block">Save changes</button></form>`, (el, close) => {
    const st = { icon: g.icon, color: g.color };
    el.addEventListener('click', (e) => {
      const i = e.target.closest('[data-i]'), c = e.target.closest('[data-c]');
      if (i) st.icon = i.dataset.i; if (c) st.color = c.dataset.c;
      el.querySelectorAll('[data-i]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.i === st.icon));
      el.querySelectorAll('[data-c]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.c === st.color));
    });
    el.querySelector('#eg').addEventListener('submit', (e) => {
      e.preventDefault(); const f = e.target;
      const target = local || S.data.groups.find((x) => x.id === g.id);
      Object.assign(target, { name: f.name.value.trim() || g.name, desc: f.desc.value.trim(), icon: st.icon, color: st.color });
      if (local) save();
      close(); toast('Group saved'); rerender();
    });
  });
}
