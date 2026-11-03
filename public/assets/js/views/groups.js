import { S, P, allGroups, myGroups, save, history, scopeHalos, nowStamp } from '../store.js';
import { avatar, esc, fmt, toast, cvar } from '../ui/components.js';
import { icon } from '../ui/icons.js';
import { countdownText } from './home.js';

export const G_ICONS = ['flame', 'shoe', 'bike', 'dumbbell', 'mountain', 'wave', 'swim', 'run', 'heart', 'bolt', 'trophy', 'walk'];
export const G_COLORS = ['brand', 'sky', 'ember', 'violet', 'gold', 'teal', 'heart'];
const colorVar = (c) => c === 'brand' ? 'var(--brand-ink)' : cvar(c);

export function gIcon(g, size = '') {
  const inner = g.photo && g.privacy === 'private' ? `<img src="${esc(g.photo)}" alt="">` : icon(g.icon);
  return `<span class="gicon ${size}" style="--gc:${colorVar(g.color)}">${inner}</span>`;
}

function groupRow(g, joined) {
  const last = joined ? history(g.id)[0] : null;
  const h = joined ? scopeHalos(g.id) : {};
  const champs = last ? Object.values(last.champions).map((c) => avatar(c.winner, { size: 'xs', halo: [c.id], link: false })).join('') : '';
  return `<a class="card row" href="#/g/${g.id}" style="gap:14px">${gIcon(g)}
    <span class="grow" style="flex:1;min-width:0"><span class="ttl" style="font-weight:600;display:block">${esc(g.name)}</span>
      <span class="s muted" style="font-size:12.5px">${g.privacy === 'public' ? 'Public' : 'Private'} · ${g.members.length} member${g.members.length === 1 ? '' : 's'}</span></span>
    <span class="row" style="gap:8px">${champs}${icon('next', 'faint')}</span></a>`;
}

export function view() {
  const mine = myGroups();
  const html = `
    <div class="row between" style="flex-wrap:wrap;gap:8px"><p class="sub" style="margin:0">Champions crowned in ${countdownText()}</p>
      <div class="row" style="gap:8px"><a class="btn ghost sm" href="#/groups/browse">${icon('search')}Browse</a><a class="btn sm" href="#/groups/new">${icon('plus')}New group</a></div></div>
    <h2 class="sec"><span>Your groups</span></h2>
    <div class="stack">${mine.map((g) => groupRow(g, true)).join('') || '<div class="empty card">You are not in any groups yet.<br><a class="btn" href="#/groups/browse">Browse groups</a></div>'}</div>`;
  return { title: 'Groups', html };
}

export function browse() {
  const pub = allGroups().filter((g) => g.privacy === 'public');
  const card = (g) => {
    const joined = g.members.includes(S.me.id);
    return `<div class="card" data-name="${esc(g.name.toLowerCase())}"><div class="row" style="gap:14px">${gIcon(g)}
      <div style="flex:1;min-width:0"><a href="#/g/${g.id}" style="font-weight:600">${esc(g.name)}</a><p class="sub" style="margin:2px 0 0">${g.members.length} members</p></div>
      ${joined ? `<a class="btn ghost sm" href="#/g/${g.id}">Open</a>` : `<button class="btn sm" data-join="${g.id}">Join</button>`}</div>
      <p class="sub">${esc(g.desc || '')}</p></div>`;
  };
  return {
    title: 'Browse groups', back: '#/groups',
    html: `<input class="input" type="search" placeholder="Search public groups" aria-label="Search public groups" id="q">
      <div class="grid mt" id="gl">${pub.map((g) => `<div class="c6 wide">${card(g)}</div>`).join('')}</div>`,
    mount(root) {
      root.querySelector('#q').addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        root.querySelectorAll('#gl > div').forEach((d) => { d.hidden = !d.firstElementChild.dataset.name.includes(q); });
      });
      root.addEventListener('click', (e) => {
        const b = e.target.closest('[data-join]'); if (!b) return;
        const id = b.dataset.join;
        S.local.left = S.local.left.filter((x) => x !== id);
        if (!S.local.joined.includes(id)) S.local.joined.push(id);
        save(); S._hist = {}; toast('Joined'); location.hash = `#/g/${id}`;
      });
    },
  };
}

export function create() {
  const html = `<form id="ng" class="card" style="max-width:640px">
    <label class="field"><span>Name</span><input class="input" name="name" required maxlength="40" placeholder="e.g. Tuesday Track Crew"></label>
    <label class="field"><span>Description</span><textarea class="input" name="desc" rows="2" maxlength="160" placeholder="What brings this group together?"></textarea></label>
    <fieldset class="field" style="border:0;padding:0;margin:0 0 16px"><span>Who can join</span>
      <div class="seg" role="radiogroup"><button type="button" data-priv="private" aria-pressed="true">Private, invite only</button><button type="button" data-priv="public" aria-pressed="false">Public, anyone can find it</button></div>
      <small id="privnote">Private groups can use any photo. Members join with an invite link.</small></fieldset>
    <div class="field" id="photo-f"><span>Photo</span><label class="btn ghost sm" style="width:max-content">${icon('image')}Choose photo<input type="file" accept="image/*" name="photo" class="vh"></label><small>Optional. Or pick an icon below.</small></div>
    <div class="field"><span>Icon</span><div class="chips" style="flex-wrap:wrap">${G_ICONS.map((i, k) => `<button type="button" class="chip" data-icon="${i}" aria-pressed="${k === 0}" aria-label="${i}">${icon(i)}</button>`).join('')}</div></div>
    <div class="field"><span>Colour</span><div class="chips" style="flex-wrap:wrap">${G_COLORS.map((c, k) => `<button type="button" class="chip" data-color="${c}" aria-pressed="${k === 0}" aria-label="${c}"><span class="sw" style="--c:${colorVar(c)};width:14px;height:14px"></span></button>`).join('')}</div></div>
    <div class="row mt2"><span id="prev"></span><button class="btn" type="submit" style="margin-left:auto">Create group</button></div>
  </form>`;
  return {
    title: 'New group', back: '#/groups', html,
    mount(root) {
      const st = { privacy: 'private', icon: 'flame', color: 'brand', photo: null };
      const f = root.querySelector('#ng');
      const paint = () => {
        root.querySelectorAll('[data-priv]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.priv === st.privacy));
        root.querySelectorAll('[data-icon]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.icon === st.icon));
        root.querySelectorAll('[data-color]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.color === st.color));
        root.querySelector('#photo-f').hidden = st.privacy === 'public';
        root.querySelector('#privnote').textContent = st.privacy === 'public'
          ? 'Public groups appear in Browse and use an icon from the gallery, not a photo.' : 'Private groups can use any photo. Members join with an invite link.';
        root.querySelector('#prev').innerHTML = gIcon({ ...st, name: '' }, 'lg');
      };
      paint();
      f.addEventListener('click', (e) => {
        const b = e.target.closest('[data-priv],[data-icon],[data-color]'); if (!b) return;
        if (b.dataset.priv) st.privacy = b.dataset.priv; if (b.dataset.icon) { st.icon = b.dataset.icon; st.photo = null; } if (b.dataset.color) st.color = b.dataset.color;
        paint();
      });
      f.photo.addEventListener('change', () => {
        const file = f.photo.files[0]; if (!file) return;
        const img = new Image(); img.onload = () => {
          const c = document.createElement('canvas'); c.width = c.height = 160;
          const s = Math.min(img.width, img.height); c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 160, 160);
          st.photo = c.toDataURL('image/jpeg', .8); paint();
        }; img.src = URL.createObjectURL(file);
      });
      f.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = 'g' + Date.now().toString(36);
        S.local.groups.push({ id, name: f.name.value.trim(), desc: f.desc.value.trim(), privacy: st.privacy, icon: st.icon, color: st.color,
          photo: st.privacy === 'private' ? st.photo : null, admins: [S.me.id], members: [S.me.id], created: S.today });
        save(); toast('Group created'); location.hash = `#/g/${id}/members`;
      });
    },
  };
}
