#!/usr/bin/env python3
"""Build public/data/demo.json: Ryan's real Garmin data (from the DGD repo
export in scripts/ryan/) plus made-up friends on other devices.

Each made-up person has a "true" physiology; their device then reads it the
way that brand does (offsets, SDNN vs RMSSD, missed nights), so the scoring
engine's normalisation has something real to undo.

Usage: python3 scripts/make_demo.py [today]   (default 2026-11-03)
"""
import json, math, os, random, sys, datetime as dt

TODAY = dt.date.fromisoformat(sys.argv[1] if len(sys.argv) > 1 else '2026-11-03')
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'public', 'data', 'demo.json')
R = random.Random(30)

# device read-outs relative to the reference (mirror of engine/devices.js)
RHR_OFFSET = {'garmin': 0, 'whoop': 1, 'coros': 0, 'fitbit': -1, 'oura': 2, 'apple': -2, 'polar': 0, 'suunto': 0}

def iso(d): return d.isoformat()

# ---------------------------------------------------------------- Ryan (real)
def ryan():
    daily = json.load(open(os.path.join(HERE, 'ryan', 'daily.json')))
    acts = json.load(open(os.path.join(HERE, 'ryan', 'activities.json')))
    start = '2026-06-01'
    d_out = [{'date': r['date'], 'rhr': r['rhr'], 'hrv': r['hrv'], 'sleep_h': r['sleep_h'],
              'bed_min_after_18': r['bed_min_after_18'], 'steps': None}
             for r in daily if r['date'] >= start and r['date'] <= iso(TODAY)]
    a_out = []
    for a in acts:
        if a['date'] < start: continue
        sport = a['sport']
        if a.get('type') == 'strength_training': sport = 'strength'
        if sport == 'tri': sport = 'other'   # multisport totals would fake run records
        a_out.append({k: a.get(k) for k in ('id', 'date', 'time', 'type', 'name', 'minutes', 'km', 'avg_hr', 'max_hr', 'elev_m',
                                             'z1_min', 'z2_min', 'z3_min', 'z4_min', 'z5_min')} | {'sport': sport})
    return {'id': 'ryan', 'name': 'Ryan France', 'first': 'Ryan', 'device': 'garmin', 'identity': 'Triathlete',
            'hue': 152, 'age': None, 'rhr': 54, 'lthr': 182, 'max_hr': 195, 'bodyweight': None, 'goal': None,
            'goalOptional': {'name': 'Ironman Nice', 'date': '2027-09-12'}, 'town': 'Dublin',
            'daily': d_out, 'activities': a_out}

# ---------------------------------------------------------------- made-up people
NAMES = {'run': ['Easy run', 'Tempo run', 'Long run', 'Intervals', 'Recovery jog'],
         'bike': ['Endurance ride', 'Turbo intervals', 'Wicklow loop', 'Coffee spin', 'Hill repeats'],
         'swim': ['Pool swim', 'Sea swim'], 'strength': ['Push day', 'Pull day', 'Leg day', 'Full body', 'Upper body'],
         'climb': ['Bouldering', 'Lead climbing', 'Board session'], 'walk': ['Walk'], 'other': ['Five-a-side', 'Yoga', 'HIIT class']}
PACE = {'run': 5.2, 'bike': 0.37, 'swim': 2.0, 'walk': 11.5}  # min per km (bike: min per km at ~27 km/h ≈ 2.2; scaled per person)

def person(pid, name, device, identity, hue, *, rhr, hrv, hrmax, sleep, sleep_sd, bed, bed_sd, steps,
           plan, start_days=150, bw=None, age=30, lifts=None, manual_rate=0.0, miss=0.06, speed=1.0, town='Dublin', marathon=None):
    first_day = TODAY - dt.timedelta(days=start_days - 1)
    daily, acts = [], []
    load_y = 0.0
    lift_base = dict(lifts or {})
    aid = 0
    for i in range(start_days):
        d = first_day + dt.timedelta(days=i)
        dow = d.weekday()
        # ------ night (belongs to the morning of d)
        drink = R.random() < (0.10 if dow in (5, 6) else 0.03)
        ln_hrv = math.log(hrv) + R.gauss(0, 0.11) - 0.0016 * load_y - (0.22 if drink else 0)
        true_rhr = rhr + R.gauss(0, 1.3) + 0.018 * load_y + (3 if drink else 0)
        sl = max(4.2, R.gauss(sleep - (0.6 if drink else 0) + (0.35 if dow in (5, 6) else 0), sleep_sd))
        b = int(R.gauss(bed + (45 if dow in (4, 5) else 0), bed_sd))
        worn = R.random() > miss
        row = {'date': iso(d), 'rhr': None, 'hrv': None, 'sleep_h': None, 'bed_min_after_18': None, 'steps': None}
        if worn:
            row['rhr'] = round(true_rhr - RHR_OFFSET[device])
            v = math.exp(ln_hrv)
            row['hrv'] = round(v / 0.8) if device == 'apple' else round(v)
            row['sleep_h'] = round(sl, 2)
            row['bed_min_after_18'] = b
        row['steps'] = max(1500, int(R.gauss(steps * (0.8 if dow == 6 else 1), steps * 0.22))) if worn else None
        daily.append(row)
        # ------ training
        load_y = 0.0
        for (days, sport, mins, frac, p) in plan:
            if dow not in days or R.random() > p: continue
            m = max(15, int(R.gauss(mins, mins * 0.15)))
            avg = round(rhr + (frac + R.gauss(0, 0.04)) * (hrmax - rhr))
            km = None
            if sport in PACE:
                base = PACE[sport] / speed if sport != 'bike' else 2.2 / speed
                km = round(m / (base * (1 + (0.62 - frac) * 0.5) + R.gauss(0, 0.08)), 2)
            aid += 1
            manual = R.random() < manual_rate
            a = {'id': f'{pid}-{aid}', 'date': iso(d), 'time': f'{R.choice([6, 7, 12, 17, 18, 19])}:{R.choice(["05", "20", "35", "50"])}',
                 'sport': sport, 'type': sport, 'name': R.choice(NAMES.get(sport, ['Workout'])), 'minutes': m, 'km': km,
                 'avg_hr': None if manual else avg, 'max_hr': None if manual else min(hrmax, avg + R.randint(14, 30)),
                 'elev_m': int(km * R.uniform(4, 14)) if sport == 'bike' and km else 0}
            if manual: a['manual'] = True
            if sport == 'strength' and lifts:
                prog = 1 + 0.0009 * i
                lift = R.choice(['squat', 'bench', 'deadlift'])
                reps = R.choice([3, 5, 5, 8])
                kg = round(lift_base[lift] * prog * (1.0 - 0.025 * reps) / 2.5) * 2.5
                a['sets'] = [{'lift': lift, 'kg': kg, 'reps': reps}] * 4
            acts.append(a)
            load_y += m / 60 * ((avg - rhr) / (0.86 * (hrmax - rhr))) ** 2 * 100
        if marathon and iso(d) == marathon[0]:
            aid += 1
            acts.append({'id': f'{pid}-{aid}', 'date': iso(d), 'time': '09:00', 'sport': 'run', 'type': 'run', 'name': marathon[1],
                         'minutes': marathon[2], 'km': 42.3, 'avg_hr': round(rhr + 0.8 * (hrmax - rhr)), 'max_hr': hrmax - 4, 'elev_m': 90})
    return {'id': pid, 'name': name, 'first': name.split()[0], 'device': device, 'identity': identity, 'hue': hue,
            'bodyweight': bw, 'age': age, 'goal': None, 'town': town, 'daily': daily, 'activities': acts}

E = [0, 1, 2, 3, 4, 5, 6]
people = [
    ryan(),
    person('cian', 'Cian Byrne', 'whoop', 'Powerlifter', 18, age=29, rhr=58, hrv=55, hrmax=188, sleep=7.1, sleep_sd=0.6, bed=300, bed_sd=35, steps=8200,
           plan=[([0, 1, 3, 4], 'strength', 80, 0.50, 0.92), ([5], 'run', 30, 0.62, 0.5), ([6], 'walk', 60, 0.28, 0.6)],
           bw=92, lifts={'squat': 190, 'bench': 135, 'deadlift': 225}),
    person('aoife', 'Aoife Kelly', 'coros', 'Marathoner', 330, age=31, rhr=44, hrv=86, hrmax=192, sleep=7.7, sleep_sd=0.5, bed=255, bed_sd=25, steps=13500,
           plan=[([0, 2, 4], 'run', 50, 0.60, 0.95), ([1], 'run', 60, 0.78, 0.9), ([3], 'strength', 40, 0.45, 0.6), ([5], 'run', 105, 0.64, 0.95), ([6], 'run', 35, 0.52, 0.5)],
           bw=56, speed=1.18, lifts={'squat': 70, 'bench': 40, 'deadlift': 90}, marathon=('2026-10-04', 'Dublin Marathon', 196)),
    person('sean', 'Seán Murphy', 'fitbit', 'Five-a-side & gym', 205, age=30, rhr=63, hrv=38, hrmax=190, sleep=6.6, sleep_sd=0.9, bed=330, bed_sd=55, steps=9000,
           plan=[([1, 3], 'strength', 60, 0.48, 0.75), ([2], 'other', 60, 0.70, 0.85), ([5], 'run', 30, 0.66, 0.35)],
           bw=78, lifts={'squat': 120, 'bench': 95, 'deadlift': 150}, manual_rate=0.25, miss=0.12),
    person('niamh', 'Niamh Walsh', 'oura', 'Climber', 275, age=28, rhr=52, hrv=72, hrmax=191, sleep=8.2, sleep_sd=0.45, bed=245, bed_sd=20, steps=9800,
           plan=[([0, 2, 4], 'climb', 100, 0.46, 0.9), ([5], 'climb', 150, 0.42, 0.6), ([1], 'other', 50, 0.30, 0.7), ([6], 'walk', 90, 0.30, 0.6)], bw=58),
    person('darragh', "Darragh O'Neill", 'apple', 'Cyclist', 45, age=33, rhr=49, hrv=62, hrmax=187, sleep=7.3, sleep_sd=0.6, bed=280, bed_sd=30, steps=7400,
           plan=[([1, 3], 'bike', 65, 0.70, 0.9), ([5], 'bike', 190, 0.60, 0.95), ([6], 'bike', 110, 0.55, 0.7), ([2], 'run', 35, 0.55, 0.3)],
           bw=74, speed=1.1, town='Wicklow'),
    person('ellie', 'Ellie Ryan', 'garmin', 'Hybrid athlete', 95, age=27, rhr=56, hrv=58, hrmax=193, sleep=7.5, sleep_sd=0.5, bed=270, bed_sd=30, steps=11000,
           plan=[([0, 3], 'strength', 60, 0.50, 0.9), ([1, 4], 'run', 40, 0.64, 0.85), ([5], 'run', 70, 0.60, 0.7)],
           start_days=6, bw=61, lifts={'squat': 85, 'bench': 50, 'deadlift': 110}),
]

EXTRA = ['Conor Doyle', 'Siobhán Lynch', 'Ciara Nolan', 'Eoin Brennan', 'Róisín Healy', 'Fionn Gallagher', 'Orla Keane', 'Tadhg Burke',
         'Saoirse Quinn', 'Liam Fitzgerald', 'Aisling Moran', 'Oisín Carroll', 'Clodagh Power', 'Rory Daly', 'Méabh Kavanagh',
         'Cathal Reilly', 'Gráinne Farrell', 'Darren Hayes']
DEVS = ['garmin', 'garmin', 'coros', 'whoop', 'apple', 'fitbit', 'oura', 'polar', 'suunto']
TOWNS = ['Cork', 'Galway', 'Limerick', 'Dublin', 'Kilkenny', 'Sligo', 'Waterford', 'Athlone']
for k, n in enumerate(EXTRA):
    sport = ['run', 'bike', 'run', 'strength', 'run', 'bike'][k % 6]
    rhr = R.randint(44, 64)
    plan = [([0, 2, 4], sport, R.randint(40, 70), R.uniform(0.5, 0.66), 0.85), ([5], sport, R.randint(70, 150), 0.58, 0.8),
            ([1, 3], 'strength' if sport != 'strength' else 'run', 45, 0.5, 0.4)]
    p = person(n.split()[0].lower().replace('í', 'i').replace('ó', 'o').replace('á', 'a').replace('é', 'e') + str(k), n, DEVS[k % len(DEVS)],
               {'run': 'Runner', 'bike': 'Cyclist', 'strength': 'Lifter'}[sport], (k * 47) % 360,
               age=R.randint(22, 45), rhr=rhr, hrv=R.randint(40, 95), hrmax=R.randint(182, 198), sleep=R.uniform(6.6, 8.0), sleep_sd=0.6, bed=R.randint(240, 320),
               bed_sd=35, steps=R.randint(7000, 14000), plan=plan, start_days=60, speed=R.uniform(0.9, 1.2), town=R.choice(TOWNS),
               bw=R.randint(55, 95), lifts={'squat': 100, 'bench': 70, 'deadlift': 130} if sport == 'strength' else None)
    p['extra'] = True
    people.append(p)
extras = [p['id'] for p in people if p.get('extra')]

# ---------------------------------------------------------------- social
friends = ['cian', 'aoife', 'sean', 'niamh', 'darragh', 'ellie']
groups = [
    {'id': 'lads', 'name': 'Sunday Club', 'privacy': 'private', 'icon': 'flame', 'color': 'brand', 'photo': None,
     'desc': 'Old school friends. Loser of the week buys the pints.', 'admins': ['ryan'], 'members': ['ryan'] + friends, 'created': '2026-06-02'},
    {'id': 'dtc', 'name': 'Dublin Tri Club', 'privacy': 'public', 'icon': 'bike', 'color': 'sky',
     'desc': 'Swim, bike, run around Dublin. Sunday spins from Phoenix Park.', 'admins': ['darragh'],
     'members': ['ryan', 'darragh', 'aoife'] + extras[:9], 'created': '2026-03-14'},
    {'id': 'rii', 'name': 'Runners in Ireland', 'privacy': 'public', 'icon': 'shoe', 'color': 'ember',
     'desc': 'Every pace welcome. Weekly long-run thread every Friday.', 'admins': [extras[0]],
     'members': ['aoife', 'ryan'] + extras, 'created': '2025-11-01'},
    {'id': 'crimp', 'name': 'Crimp Crew', 'privacy': 'private', 'icon': 'mountain', 'color': 'violet',
     'desc': 'Gravity Climbing regulars.', 'admins': ['niamh'], 'members': ['niamh', 'ellie', 'sean'], 'created': '2026-08-20'},
    {'id': 'iron', 'name': 'Iron Paradise Galway', 'privacy': 'public', 'icon': 'dumbbell', 'color': 'gold',
     'desc': 'Lifters in the west. Strength board updated with every logged session.', 'admins': [extras[3]],
     'members': [e for e in extras if e.startswith(('eoin', 'tadhg', 'rory', 'cathal'))] + ['cian'], 'created': '2026-01-09'},
    {'id': 'sea', 'name': 'Forty Foot Dawn Dippers', 'privacy': 'public', 'icon': 'wave', 'color': 'teal',
     'desc': 'Cold water, warm flasks. Sunrise swims all year.', 'admins': [extras[1]], 'members': extras[1:8], 'created': '2026-02-01'},
]

def ts(days_ago, hh, mm): return f'{iso(TODAY - dt.timedelta(days=days_ago))}T{hh:02d}:{mm:02d}'
chats = {
    'lads': [
        {'at': ts(2, 9, 12), 'from': 'cian', 'text': 'Who had the 30 recovery yesterday? Saw a red ring on the board'},
        {'at': ts(2, 9, 20), 'from': 'sean', 'text': 'Birthday drinks. No regrets.'},
        {'at': ts(2, 9, 21), 'from': 'niamh', 'text': 'Some regrets, judging by the HRV'},
        {'at': ts(1, 7, 2), 'from': 'aoife', 'text': 'Load board is wide open this week, Ryan is on a recovery week'},
        {'at': ts(1, 7, 40), 'from': 'ryan', 'text': 'Enjoy it while it lasts'},
        {'at': ts(0, 8, 5), 'from': 'darragh', 'text': 'Ellie unlocks next week, then we see what the hybrid crowd is made of'},
        {'at': ts(0, 8, 11), 'from': 'ellie', 'text': 'Calibrating. Quietly.'},
    ],
    'dtc': [
        {'at': ts(3, 18, 30), 'from': 'darragh', 'text': 'Sunday spin from the Wellington Monument, 9:00. Bring lights.'},
        {'at': ts(1, 20, 1), 'from': extras[2], 'text': 'Pool is closed Thursday, moving the swim set to Friday'},
    ],
    'crimp': [{'at': ts(1, 21, 0), 'from': 'niamh', 'text': 'New set on the comp wall Wednesday'}],
    'rii': [{'at': ts(4, 12, 0), 'from': extras[0], 'text': 'Long-run thread: where is everyone heading this weekend?'},
            {'at': ts(4, 12, 30), 'from': 'aoife', 'text': '28 km around Howth, easy pace, all welcome'}],
}
dms = {'aoife': [
    {'at': ts(1, 19, 2), 'from': 'aoife', 'text': 'Fancy a Saturday long run? Easy pace, promise.'},
    {'at': ts(1, 19, 30), 'from': 'ryan', 'text': 'Go on. Zone 2 though, I have a CSS test hangover'},
    {'at': ts(0, 7, 15), 'from': 'aoife', 'text': '9am Clontarf then'}],
    'cian': [{'at': ts(3, 13, 0), 'from': 'cian', 'text': 'Coffee is on you next week'}]}

COMMENTS = {'run': ['Flying', 'Pace on that', 'Easy now', 'Legs for days'], 'bike': ['Big miles', 'Wind was savage today', 'Nice loop'],
            'strength': ['Strong', 'Leg day? Respect', 'Form check video or it did not happen'], 'climb': ['Sent it?', 'Crimpy'],
            'swim': ['Fish', 'Cold one'], 'other': ['Get in', 'Nice one'], 'walk': ['Steps are steps']}
feed = {}
circle = ['ryan'] + friends
for p in people:
    if p['id'] not in circle: continue
    for a in p['activities']:
        if a['date'] < iso(TODAY - dt.timedelta(days=14)): continue
        others = [x for x in circle if x != p['id']]
        kud = R.sample(others, R.randint(0, 4))
        com = []
        if R.random() < 0.35:
            who = R.choice(others)
            com.append({'from': who, 'text': R.choice(COMMENTS.get(a['sport'], ['Nice one'])), 'at': a['date'] + 'T21:00'})
        feed[a['id']] = {'kudos': kud, 'comments': com}

mon = TODAY - dt.timedelta(days=TODAY.weekday())
challenges = [
    {'id': 'c1', 'a': 'ryan', 'b': 'cian', 'metric': 'load', 'start': iso(mon), 'end': iso(mon + dt.timedelta(days=6)), 'stake': 'Loser buys coffee', 'status': 'active'},
    {'id': 'c2', 'a': 'niamh', 'b': 'ryan', 'metric': 'sleep', 'start': iso(mon - dt.timedelta(days=7)), 'end': iso(mon - dt.timedelta(days=1)), 'stake': 'Bragging rights', 'status': 'done'},
    {'id': 'c3', 'a': 'aoife', 'b': 'ryan', 'metric': 'consistency', 'start': iso(mon), 'end': iso(mon + dt.timedelta(days=13)), 'stake': 'Winner picks the long-run route', 'status': 'invite'},
]

data = {
    'meta': {'today': iso(TODAY), 'me': 'ryan', 'generated': dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')},
    'people': people, 'friends': {'ryan': friends}, 'requests': [{'from': extras[0], 'to': 'ryan', 'at': ts(0, 10, 2)}],
    'groups': groups, 'chats': chats, 'dms': dms, 'feed': feed, 'challenges': challenges,
}
os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump(data, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('wrote', OUT, os.path.getsize(OUT) // 1024, 'KB,', len(people), 'people')
