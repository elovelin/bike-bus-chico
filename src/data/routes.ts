/**
 * Bike Bus Chico — route data
 * ----------------------------
 * Every Bike Bus route on the site is defined here. Pages read from this
 * file, so adding or editing a route is as simple as editing this list —
 * you never touch the page markup.
 *
 * To add a route: copy an existing block inside the `routes` array, paste it,
 * and change the details. Keep the `slug` unique (lowercase, dashes-only).
 */

/** A route's operating status. Controls the little badge shown on cards. */
export type RouteStatus = 'active' | 'forming' | 'paused';

export interface RouteStop {
  /** Stop name, e.g. "Madrone Avenue Bike Bridge — south side". */
  name: string;
  /** Scheduled time, when confirmed, e.g. "7:44 AM". */
  time?: string;
  /** Optional extra detail shown under the stop name. */
  note?: string;
}

export interface Route {
  /** URL-safe id, used in the page address: /routes/<slug>/ */
  slug: string;
  /** Public route name, e.g. "Hancock Park → CCDS". */
  name: string;
  /** Destination school. */
  school: string;
  schoolSlug: string;
  /** Day(s) the Bike Bus runs, e.g. "Fridays". */
  day: string;
  /** Departure time from the first stop. */
  startTime: string;
  /** Optional label to identify which branch has a confirmed departure time. */
  startLabel?: string;
  /** Approximate arrival time at school, when confirmed. */
  arrivalTime?: string;
  /** Approximate distance, e.g. "~4.5 miles". */
  distance?: string;
  status: RouteStatus;
  /** Name of the volunteer who leads this route, e.g. "Eric Lovelin". */
  leaderName?: string;
  /** One or two friendly sentences for cards and the route header. */
  summary: string;
  /** Optional guidance about which stops or branches have confirmed schedules. */
  scheduleNote?: string;
  joinLocations?: string[];
  mapViewerUrl?: string;
  /** Ordered list of stops, first to last. */
  stops: RouteStop[];
  /** Optional: path to a route map image in /public/routes/. */
  mapImage?: string;
  mapAlt?: string;
  mapWidth?: number;
  mapHeight?: number;
  /** Optional: path to a printable route PDF in /public/routes/. */
  routePdf?: string;
}

/** Human-friendly labels + roles for each status. */
export const statusMeta: Record<RouteStatus, { label: string; tone: string }> = {
  active: { label: 'Running now', tone: 'active' },
  forming: { label: 'Starting soon', tone: 'forming' },
  paused: { label: 'On a break', tone: 'paused' },
};

export const routes: Route[] = [
  {
    slug: 'hancock-park-ccds',
    name: 'Hancock Park → Chico Country Day School',
    school: 'Chico Country Day School',
    schoolSlug: 'chico-country-day-school',
    day: 'Fridays',
    startTime: '7:25 AM',
    arrivalTime: '~8:10 AM',
    distance: '~4.5 miles',
    status: 'active',
    leaderName: 'Eric Lovelin',
    summary:
      'Our founding route. Families gather at Hancock Park and roll out together, picking up more riders at stops along the way to Bidwell Park. The SE Chico / Baroni Park crew joins at the bridge under Hwy 99 in Bidwell Park, then we ride through downtown to Chico Country Day School together — arriving in plenty of time for the 8:25 bell.',
    scheduleNote:
      'Meet the SE Chico / Baroni Park crew at the bridge under Hwy 99 in Bidwell Park, then ride through downtown together. A bridge meetup time has not been confirmed; the scheduled stops below are unchanged.',
    stops: [
      {
        name: 'Hancock Park',
        time: '7:25 AM',
        note: 'Gather a few minutes early — this is where we roll out.',
      },
      {
        name: 'PVHS Bus Stop — Manzanita & Marigold',
        time: '7:31 AM',
      },
      {
        name: 'Madrone Avenue Bike Bridge — south side',
        time: '7:34 AM',
      },
      {
        name: 'Bidwell Park entrance — Madrone & Vallombrosa',
        time: '7:37 AM',
      },
      {
        name: 'Chico Country Day School',
        time: '~8:10 AM',
        note: 'Arrive together, with time to spare before the 8:25 bell.',
      },
    ],
    mapImage: '/routes/hancock-park-map-3b93b79529e3.png',
    mapAlt: 'Hancock Park route through Bidwell Park to Chico Country Day School, with stop markers A through E.',
    mapWidth: 717,
    mapHeight: 1180,
    routePdf: '/routes/hancock-park-route.pdf',
  },
  {
    slug: 'west-chico-ccds',
    name: 'West Chico → Chico Country Day School',
    school: 'Chico Country Day School',
    schoolSlug: 'chico-country-day-school',
    day: 'Fridays',
    startTime: '7:50 AM',
    startLabel: 'Warner rollout',
    arrivalTime: 'By 8:15 AM',
    distance: '2.1 miles',
    status: 'active',
    summary:
      'Two neighborhood branches ride from West Chico and meet at the flashing stop sign on Warner at CSU Chico at 8:00 AM, then ride together to Chico Country Day School by 8:15 AM. The Warner St. Orchard branch rolls out at 7:50 AM.',
    scheduleNote:
      "The starting stop below is for the Warner St. Orchard branch. Contact the crew for the other branch's starting point and departure time.",
    stops: [
      {
        name: 'Warner St. Orchard',
        time: '7:50 AM',
        note: 'Warner St. Orchard branch: gather a few minutes early — this is where we roll out.',
      },
      {
        name: 'Flashing Stop Sign on Warner at CSU Chico',
        time: '8:00 AM',
        note: 'Both neighborhood branches meet here and continue to school together.',
      },
      {
        name: 'Chico Country Day School',
        time: 'By 8:15 AM',
        note: 'Arrive together, with time to spare before the bell.',
      },
    ],
    mapImage: '/routes/west-chico-map-6832c28e94a5.png',
    mapAlt: 'Two West Chico neighborhood branches converge near CSU Chico at marker C and continue to Chico Country Day School at marker D.',
    mapWidth: 1389,
    mapHeight: 1220,
  },
  {
    slug: 'se-chico-baroni-park-ccds',
    name: 'SE Chico / Baroni Park → Chico Country Day School',
    school: 'Chico Country Day School',
    schoolSlug: 'chico-country-day-school',
    day: 'Fridays',
    startTime: '7:35 AM',
    status: 'active',
    summary:
      'Ride from SE Chico / Baroni Park, meet the Hancock Park crew at the bridge under Hwy 99 in Bidwell Park, then ride through downtown to Chico Country Day School together.',
    scheduleNote:
      'Roll out from SE Chico / Baroni Park at 7:35 AM on Fridays. See the map for the route and contact the crew to confirm the exact gathering spot. A bridge meetup time and a separate arrival time have not been confirmed.',
    stops: [
      { name: 'SE Chico / Baroni Park', time: '7:35 AM', note: 'Check the map and confirm the gathering spot with the crew before your first ride.' },
      { name: 'Bridge under Hwy 99 in Bidwell Park', note: 'Meet the Hancock Park crew and continue through downtown together.' },
      { name: 'Chico Country Day School', note: 'Ride to school together with the Hancock Park crew.' },
    ],
    mapImage: '/routes/se-chico-baroni-park-map-0d92477f6500.png',
    mapAlt: 'Supplied SE Chico / Baroni Park route map to Chico Country Day School, including the connection with the Hancock Park crew in Bidwell Park.',
    mapWidth: 1999,
    mapHeight: 878,
  },
  {
    slug: 'centennial-parkview',
    name: '8th St to school',
    school: 'Parkview Elementary',
    schoolSlug: 'parkview-elementary',
    day: 'Fridays',
    startTime: '8:00 AM',
    arrivalTime: '8:10 AM',
    status: 'active',
    summary:
      'A Friday neighborhood ride from Centennial Avenue and E 8th Street, following the bike path along E 8th Street and Bidwell Park to Parkview Elementary.',
    stops: [
      { name: 'Centennial Avenue & E 8th Street', time: '8:00 AM' },
      { name: 'Parkview Elementary', time: 'By 8:10 AM' },
    ],
    joinLocations: ['El Monte Avenue', 'Forest Avenue', 'Kern, Glenn, or El Dorado neighborhood streets closer to school'],
    mapImage: '/routes/parkview-map-61d79e1a6e69.png',
    mapAlt: 'Parkview route map showing the blue route from marker A near Centennial Avenue and E 8th Street, alongside Lower Bidwell Park, to marker B at Parkview Elementary School.',
    mapWidth: 1680,
    mapHeight: 1268,
    mapViewerUrl: 'https://www.google.com/maps/d/viewer?mid=1_CZ_hDQOpPKBpDb2zlrSwhmsFYHcrDE',
  },
];

/** Look up a single route by its slug. */
export function getRoute(slug: string): Route | undefined {
  return routes.find((r) => r.slug === slug);
}
