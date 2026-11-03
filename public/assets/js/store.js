// App state: the demo dataset plus everything the user changes locally
// (messages, kudos, settings, manual workouts, new groups…). In the prototype
// local changes live in localStorage; the Worker API replaces this later.

import { buildSeries, weekStart } from './engine/scoring.js';
import { championHistory, halos } from './engine/awards.js';

const KEY = 'locked.v1';
export const DEFAULT_SETTINGS = {
  theme: 'grit', mode: 'dark',
  notify: { overtaken: true, champions: true, requests: true, h2h: true, morning: false, nudges: false, chat: true },
  privacy: { recovery: 'friends', hrv: 'friends', rhr: 'friends', sleep: 'friends', load: 'friends', steps: 'friends', workouts: 'friends' },
  showGoal: false, units: 'metric', homeBoard: 'lads',
};

export const S = { data: null, people: {}, me: null, today: null, local: null, settings: null, _hist: {} };

export async function load() {
  const res = await fetch('data/demo.json');
  S.data = await res.json();
  try { S.local = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { S.local = {}; }
  S.local = { chats: {}, dms: {}, kudos: {}, comments: {}, challenges: [], groups: [], joined: [], left: [], manual: [], friends: [], read: {}, ...S.local };
  S.settings = { ...DEFAULT_SETTINGS, ...(S.local.settings || {}) };
  S.settings.notify = { ...DEFAULT_SETTINGS.notify, ...(S.settings.notify || {}) };
  S.settings.privacy = { ...DEFAULT_SETTINGS.privacy, ...(S.settings.privacy || {}) };
  S.today = S.data.meta.today;
  for (const p of S.data.people) S.people[p.id] = p;
  S.me = S.people[S.data.meta.me];
  S.me.activities.push(...S.local.manual);
  rebuild();
}

export function rebuild(ids) {
  for (const p of Object.values(S.people)) if (!ids || ids.includes(p.id)) p.series = buildSeries(p, S.today);
  S._hist = {};
}

export function save() {
  S.local.settings = S.settings;
  try { localStorage.setItem(KEY, JSON.stringify(S.local)); } catch { /* private mode: changes last for this visit */ }
}
export function resetLocal() { try { localStorage.removeItem(KEY); } catch {} location.reload(); }

// ---------- people ----------
export const P = (id) => S.people[id];
export function friendIds() { return [...(S.data.friends[S.me.id] || []), ...S.local.friends]; }
export const isFriend = (id) => friendIds().includes(id);
export const circle = () => [S.me, ...friendIds().map(P)];
export function pendingRequests() { return S.data.requests.filter((r) => r.to === S.me.id && !S.local.friends.includes(r.from) && !(S.local.declined || []).includes(r.from)); }

// Can `viewer` see `target`'s detail for this metric? Friends see what the
// target's privacy allows; everyone else (public-group members) sees scores only.
export function canSeeDetail(targetId, area = 'recovery') {
  if (targetId === S.me.id) return true;
  return isFriend(targetId); // other people's privacy settings would be checked server-side
}

// ---------- groups ----------
export function allGroups() {
  const base = S.data.groups.map((g) => ({ ...g, members: [...g.members] }));
  for (const g of base) {
    if (S.local.joined.includes(g.id) && !g.members.includes(S.me.id)) g.members.push(S.me.id);
    if (S.local.left.includes(g.id)) g.members = g.members.filter((m) => m !== S.me.id);
  }
  return [...base, ...S.local.groups];
}
export const group = (id) => allGroups().find((g) => g.id === id);
export const myGroups = () => allGroups().filter((g) => g.members.includes(S.me.id));

// A scope is "friends" or a group id; it decides who's on a board and whose halos show.
export function scopeMembers(scope) {
  if (!scope || scope === 'friends') return circle();
  const g = group(scope);
  return g ? g.members.map(P).filter(Boolean) : circle();
}
export function scopeName(scope) { return !scope || scope === 'friends' ? 'Friends' : (group(scope)?.name || 'Friends'); }

export function history(scope) {
  return (S._hist[scope] ||= championHistory(scopeMembers(scope), S.today, 12));
}
export function scopeHalos(scope) { return halos(history(scope)); }

// ---------- time ----------
export function nextAnnouncement() {
  const now = new Date();
  const [y, m, d] = S.today.split('-').map(Number);
  const base = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds());
  const sun = new Date(y, m - 1, d + ((7 - base.getDay()) % 7), 18, 0, 0);
  if (sun <= base) sun.setDate(sun.getDate() + 7);
  return { at: sun, ms: sun - base };
}
export function nowStamp() {
  const t = new Date();
  return `${S.today}T${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
}
export const thisMonday = () => weekStart(S.today);
