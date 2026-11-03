// Stroke icons, 24×24, drawn for this app.
const P = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/><path d="M8 6H4.5v1.5A3.5 3.5 0 0 0 8 11M16 6h3.5v1.5A3.5 3.5 0 0 1 16 11"/><path d="M12 13v4M8.5 20h7M9.5 17h5"/>',
  feed: '<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M4 9h16M8 13h8M8 16h5"/>',
  users: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19.5c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="17" cy="9.5" r="2.4"/><path d="M15.5 14.6c2.6-.4 4.5 1.3 5 4.4"/>',
  user: '<circle cx="12" cy="8.5" r="3.6"/><path d="M5 20c.8-3.8 3.6-6 7-6s6.2 2.2 7 6"/>',
  bell: '<path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 1.5h-15L6 16.5Z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>',
  chat: '<path d="M4 5h16v11H9l-5 4V5Z"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z"/>',
  moon: '<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5Z"/>',
  bolt: '<path d="M13 3 5 13.5h6L10 21l8-10.5h-6L13 3Z"/>',
  flame: '<path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.4 2.4-5.2 3.6-8.3.9 1.9 2 2.8 3.2 3.3C12.6 7 13.5 4.6 15.5 3c-.2 3.1 3 5.4 3 10 0 4.6-2.6 8-6.5 8Z"/>',
  pulse: '<path d="M3 12h4l2-5 4 10 2-5h6"/>',
  gauge: '<path d="M4.5 17a8 8 0 1 1 15 0"/><path d="M12 13l3.5-4"/>',
  repeat: '<path d="M4 12a7 7 0 0 1 12-5l2 2M20 12a7 7 0 0 1-12 5l-2-2"/><path d="M18 4v5h-5M6 20v-5h5"/>',
  steps: '<path d="M8 3.5c1.8 0 2.6 2 2.4 4.5L10 11H6.3L6 8c-.3-2.6.3-4.5 2-4.5ZM6.4 13h3.5l-.2 2a1.7 1.7 0 0 1-3.4 0l.1-2ZM16 7.5c1.7 0 2.3 1.9 2 4.5l-.3 3h-3.7l-.4-3c-.2-2.5.6-4.5 2.4-4.5ZM14.1 17h3.5l.1 2a1.7 1.7 0 0 1-3.4 0l-.2-2Z"/>',
  shoe: '<path d="M3 16.5V9.5l3.5-1 2 3 3-1 5 3.5c2 .7 4.5 1 4.5 3V18H3v-1.5Z"/><path d="M3 15h18"/>',
  bike: '<circle cx="6" cy="16" r="3.5"/><circle cx="18" cy="16" r="3.5"/><path d="M6 16l4-7h6l2 7M10 9 8 6H6M12 16l3-7"/>',
  dumbbell: '<path d="M3 10v4M6 7.5v9M18 7.5v9M21 10v4M6 12h12"/>',
  mountain: '<path d="M2.5 19.5 9 8l3.5 6 2-3 7 8.5h-19Z"/><path d="m7.4 10.8 1.6 1.2 1.4-1.4"/>',
  wave: '<path d="M2.5 9c2-1.5 3.7-1.5 5.5 0s3.5 1.5 5.5 0 3.5-1.5 5.5 0 2.5 1 2.5 1M2.5 14c2-1.5 3.7-1.5 5.5 0s3.5 1.5 5.5 0 3.5-1.5 5.5 0 2.5 1 2.5 1M2.5 19c2-1.5 3.7-1.5 5.5 0s3.5 1.5 5.5 0 3.5-1.5 5.5 0"/>',
  swim: '<circle cx="16.5" cy="6.5" r="2"/><path d="m4 12 5-3 3.5 3.5L15 11M2.5 17c2-1.4 3.7-1.4 5.5 0s3.5 1.4 5.5 0 3.5-1.4 5.5 0 2.5 1 2.5 1"/>',
  climb: '<path d="M2.5 19.5 9 8l3.5 6 2-3 7 8.5h-19Z"/>',
  walk: '<circle cx="13" cy="4.5" r="1.8"/><path d="m10 21 2-6-2.5-2.5L11 8l3 3h3M9.5 12.5 7 14M14.5 15l1.5 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  back: '<path d="m14.5 5-7 7 7 7"/>',
  next: '<path d="m9.5 5 7 7-7 7"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="1"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  vs: '<path d="M4 4l7 8-7 8M20 4l-7 8 7 8"/>',
  medal: '<circle cx="12" cy="15" r="5"/><path d="M8.5 11 6 3.5h4L12 9l2-5.5h4L15.5 11"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  send: '<path d="M4 12 20 4l-5 16-3.5-6.5L4 12Z"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  watch: '<rect x="6.5" y="6.5" width="11" height="11" rx="2.5"/><path d="M9 6.5 9.5 3h5l.5 3.5M9 17.5l.5 3.5h5l.5-3.5M12 9.5V12l1.5 1"/>',
  image: '<rect x="3.5" y="4.5" width="17" height="15" rx="1"/><circle cx="9" cy="10" r="1.8"/><path d="m4 18 5-5 3 3 3-3 5 5"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 3.5 5.4 3.5 8.5s-1 5.9-3.5 8.5c-2.5-2.6-3.5-5.4-3.5-8.5s1-5.9 3.5-8.5Z"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4Z"/>',
  calendar: '<rect x="4" y="5.5" width="16" height="14" rx="1"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
  chart: '<path d="M4 20V4M4 20h16"/><path d="m7.5 15 4-5 3 3 4.5-6"/>',
  timer: '<circle cx="12" cy="13.5" r="7"/><path d="M12 13.5V10M9.5 3.5h5"/>',
  other: '<circle cx="12" cy="12" r="8"/><path d="M8 12h8"/>',
  run: '<circle cx="14.5" cy="4.5" r="1.8"/><path d="m6 21 3.5-6 3 2 1-5.5-3-2-3 2.5M12.5 11.5l2.5 2.5h3.5M9.5 15l-3.5-.5"/>',
  strength: '<path d="M3 10v4M6 7.5v9M18 7.5v9M21 10v4M6 12h12"/>',
};
export function icon(name, cls = '') {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || P.other}</svg>`;
}
export const SPORT_ICON = { run: 'run', bike: 'bike', swim: 'swim', strength: 'strength', climb: 'climb', walk: 'walk', other: 'pulse' };
export const SPORT_NAME = { run: 'Run', bike: 'Ride', swim: 'Swim', strength: 'Strength', climb: 'Climb', walk: 'Walk', other: 'Workout' };

// Locked placeholder mark: a padlock whose shackle is a heart-rate trace.
export function logo(size = 40) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 48 48" aria-label="Locked" role="img">
    <rect x="7" y="20" width="34" height="23" rx="2" fill="var(--brand)"/>
    <path d="M14 20v-6a10 10 0 0 1 20 0v6" fill="none" stroke="var(--ink)" stroke-width="3.2" stroke-linecap="square"/>
    <path d="M11 32h7l2.5-5 4 10 3-7 1.5 2H37" fill="none" stroke="#fff" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>
  </svg>`;
}
