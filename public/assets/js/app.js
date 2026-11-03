import { S, load, save, pendingRequests } from './store.js';
import { icon, logo } from './ui/icons.js';
import { sheet, INFO, animate, esc } from './ui/components.js';
import * as Home from './views/home.js';
import * as Boards from './views/boards.js';
import * as Feed from './views/feed.js';
import * as Groups from './views/groups.js';
import * as Group from './views/group.js';
import * as Profile from './views/profile.js';
import * as Social from './views/social.js';
import * as More from './views/more.js';

const FONTS = {
  grit: 'family=Archivo:wdth,wght@62..125,100..900&family=Inter:wght@400;500;600;700',
  minimal: 'family=Inter:wght@400;500;600;700',
  playful: 'family=Bricolage+Grotesque:opsz,wght@12..96,400..800',
  sporty: 'family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:ital,wght@0,700;0,800;1,700;1,800',
  nerdy: 'family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500',
};
export function applyTheme() {
  const s = S.settings, root = document.documentElement;
  const mode = s.mode === 'system' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : s.mode;
  root.dataset.look = s.theme; root.dataset.mode = mode;
  root.dataset.density = s.theme === 'nerdy' ? 'dense' : 'normal';
  document.getElementById('font-link').href = `https://fonts.googleapis.com/css2?${FONTS[s.theme]}&display=swap`;
  const tc = document.querySelector('meta[name="theme-color"]');
  if (tc) tc.content = getComputedStyle(root).getPropertyValue('--bg').trim() || '#0b0b0b';
}

// ---------- routes ----------
const ROUTES = [
  [/^\/home$/, Home.view, 'home'],
  [/^\/boards$/, Boards.view, 'boards'],
  [/^\/boards\/(\w+)$/, Boards.view, 'boards'],
  [/^\/records$/, More.records, 'boards'],
  [/^\/feed$/, Feed.view, 'feed'],
  [/^\/groups$/, Groups.view, 'groups'],
  [/^\/groups\/browse$/, Groups.browse, 'groups'],
  [/^\/groups\/new$/, Groups.create, 'groups'],
  [/^\/g\/([\w-]+)$/, Group.view, 'groups'],
  [/^\/g\/([\w-]+)\/(\w+)$/, Group.view, 'groups'],
  [/^\/u\/([\w-]+)$/, Profile.view, 'me'],
  [/^\/u\/([\w-]+)\/m\/(\w+)$/, Profile.metric, 'me'],
  [/^\/u\/([\w-]+)\/a\/([\w-]+)$/, Profile.activity, 'feed'],
  [/^\/h2h$/, Social.h2hList, 'boards'],
  [/^\/h2h\/new$/, Social.h2hNew, 'boards'],
  [/^\/h2h\/(\w+)$/, Social.h2hView, 'boards'],
  [/^\/friends$/, Social.friends, 'me'],
  [/^\/messages$/, Social.inbox, 'me'],
  [/^\/dm\/([\w-]+)$/, Social.dm, 'me'],
  [/^\/notifications$/, Social.notifications, 'home'],
  [/^\/badges$/, More.badges, 'me'],
  [/^\/connect$/, More.connect, 'me'],
  [/^\/log$/, More.logWorkout, 'me'],
  [/^\/settings$/, More.settings, 'me'],
  [/^\/how$/, More.how, 'me'],
];
const TABS = [
  ['home', '#/home', 'home', 'Home'], ['boards', '#/boards', 'trophy', 'Boards'], ['feed', '#/feed', 'feed', 'Feed'],
  ['groups', '#/groups', 'users', 'Groups'], ['me', '#/u/ryan', 'user', 'Profile'],
];

function rail(active) {
  const me = S.me.id;
  return `<a class="logo" href="#/home" aria-label="Locked home">${logo(40)}</a>` +
    TABS.map(([k, h, ic, l]) => `<a href="${k === 'me' ? '#/u/' + me : h}" ${k === active ? 'aria-current="page"' : ''}>${icon(ic)}<span>${l}</span></a>`).join('') +
    `<span class="sp"></span><a class="desk" href="#/settings">${icon('settings')}<span>Settings</span></a>`;
}

function topbar(v) {
  const unread = pendingRequests().length + (S.local.read.notifications ? 0 : 3);
  const back = v.back === 'history' ? `<button class="back" data-hback aria-label="Back">${icon('back')}</button>`
    : v.back ? `<a class="back" href="${v.back}" aria-label="Back">${icon('back')}</a>` : `<span class="mlogo">${logo(30)}</span>`;
  const acts = v.actions ?? `<a class="iconbtn" href="#/messages" aria-label="Messages">${icon('chat')}</a><a class="iconbtn" href="#/notifications" aria-label="Notifications">${icon('bell')}${unread ? '<span class="dot"></span>' : ''}</a>`;
  return `${back}<h1>${esc(v.title)}</h1><div class="acts">${acts}</div>`;
}

let cleanup = null;
export let query = new URLSearchParams();
export async function render() {
  const [path0, qs = ''] = location.hash.replace(/^#/, '').split('?');
  const path = path0 || '/home';
  query = new URLSearchParams(qs);
  let match, fn, tab;
  for (const [re, f, t] of ROUTES) { match = path.match(re); if (match) { fn = f; tab = t; break; } }
  if (!fn) { location.replace('#/home'); return; }
  if (cleanup) { cleanup(); cleanup = null; }
  const v = await fn(...match.slice(1));
  if (tab === 'me' && match[1] && match[1] !== S.me.id && /^\/u\//.test(path)) tab = 'boards';
  document.getElementById('rail').innerHTML = rail(tab);
  document.getElementById('top').innerHTML = topbar(v);
  const main = document.getElementById('main');
  main.innerHTML = v.html;
  document.title = v.title === 'Locked' ? 'Locked' : `${v.title} · Locked`;
  if (v.mount) cleanup = v.mount(main) || null;
  animate(main);
  if (!v.keepScroll) window.scrollTo(0, 0);
}
export const rerender = () => { const y = window.scrollY; return render().then(() => window.scrollTo(0, y)); };

// global delegation: (i) explanations and the manual-entry badge
document.addEventListener('click', (e) => {
  const i = e.target.closest('[data-info]');
  if (i) { e.preventDefault(); const [t, d] = INFO[i.dataset.info] || ['', '']; sheet(`<h3>${esc(t)}</h3><p>${esc(d)}</p>`); return; }
  if (e.target.closest('[data-hback]')) { history.length > 1 ? history.back() : (location.hash = '#/home'); return; }
  const m = e.target.closest('[data-manual]');
  if (m) { e.preventDefault(); e.stopPropagation(); const [t, d] = INFO.manual; sheet(`<h3>${t}</h3><p>${d}</p>`); }
});

window.addEventListener('hashchange', render);
(async () => {
  await load();
  applyTheme();
  matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => S.settings.mode === 'system' && applyTheme());
  render();
})();
export { save };
