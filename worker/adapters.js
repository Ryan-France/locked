// One adapter per data source. Each turns a provider payload into Locked's
// shared rows: daily {user_id,date,rhr,hrv,sleep_h,bed_min_after_18,steps}
// and activities {user_id,external_id,date,time,sport,minutes,km,avg_hr,max_hr,z1_min…}.
//
// Field names below are placeholders to confirm against each provider's
// current API docs when the developer accounts are approved. Swapping to an
// aggregator later means adding one adapter here; nothing else changes.

const SPORT = (t = '') => {
  t = t.toLowerCase();
  if (/run|trail|treadmill/.test(t)) return 'run';
  if (/cycl|bike|ride|virtual_ride/.test(t)) return 'bike';
  if (/swim/.test(t)) return 'swim';
  if (/strength|weight|lift/.test(t)) return 'strength';
  if (/climb|boulder/.test(t)) return 'climb';
  if (/walk|hik/.test(t)) return 'walk';
  return 'other';
};

const pending = (name) => ({
  verify: async () => false,
  normalise: () => { throw new Error(`${name} adapter not implemented yet`); },
});

export const ADAPTERS = {
  // Garmin Health API (needs the Garmin Connect Developer Program approval).
  // Until approved, Ryan's own data can keep flowing from the DGD Garmin sync.
  garmin: pending('garmin'),
  // Whoop developer API: open sign-up, OAuth, webhooks for recovery/sleep/workout.
  whoop: pending('whoop'),
  // Oura API v2: personal tokens or OAuth.
  oura: pending('oura'),
  // Fitbit Web API / Google Health API: OAuth.
  fitbit: pending('fitbit'),
  // Polar AccessLink: open registration.
  polar: pending('polar'),
  // Coros: partner API by application.
  coros: pending('coros'),
  // Strava: fallback for workouts from any brand (no sleep or HRV).
  strava: pending('strava'),
  // Apple Health has no web API: needs a native iOS companion app.
  apple: pending('apple'),
};
export { SPORT };
