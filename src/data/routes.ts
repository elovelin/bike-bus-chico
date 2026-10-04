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
  /** Scheduled time the Bike Bus reaches this stop, e.g. "7:44 AM". */
  time: string;
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
  /** Day(s) the Bike Bus runs, e.g. "Fridays". */
  day: string;
  /** Departure time from the first stop. */
  startTime: string;
  /** Optional label to identify which branch has a confirmed departure time. */
  startLabel?: string;
  /** Approximate arrival time at school. */
  arrivalTime: string;
  /** Approximate distance, e.g. "~4.5 miles". */
  distance: string;
  status: RouteStatus;
  /** Name of the volunteer who leads this route, e.g. "Eric Lovelin". */
  leaderName?: string;
  /** Email for reaching this route's leader directly to join or ask questions. */
  leaderEmail?: string;
  /** One or two friendly sentences for cards and the route header. */
  summary: string;
  /** Optional guidance about which stops or branches have confirmed schedules. */
  scheduleNote?: string;
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
  forming: { label: 'Forming', tone: 'forming' },
  paused: { label: 'On a break', tone: 'paused' },
};

export const routes: Route[] = [
  {
    slug: 'hancock-park-ccds',
    name: 'Hancock Park → Chico Country Day School',
    school: 'Chico Country Day School',
    day: 'Fridays',
    startTime: '7:25 AM',
    arrivalTime: '~8:10 AM',
    distance: '~4.5 miles',
    status: 'active',
    leaderName: 'Eric Lovelin',
    leaderEmail: 'ericlovelin@outlook.com',
    summary:
      'Our founding route. Families gather at Hancock Park and roll out together, picking up more riders at stops along the way to Bidwell Park before continuing across town to Chico Country Day School — arriving in plenty of time for the 8:25 bell.',
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
    mapImage: '/routes/hancock-park-map.png',
    mapAlt: 'Hancock Park route through Bidwell Park to Chico Country Day School, with stop markers A through E.',
    mapWidth: 717,
    mapHeight: 1180,
    routePdf: '/routes/hancock-park-route.pdf',
  },
  {
    slug: 'west-chico-ccds',
    name: 'West Chico → Chico Country Day School',
    school: 'Chico Country Day School',
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
    mapImage: '/routes/west-chico-map.png',
    mapAlt: 'Two West Chico neighborhood branches converge near CSU Chico at marker C and continue to Chico Country Day School at marker D.',
    mapWidth: 1389,
    mapHeight: 1220,
  },
];

/** Look up a single route by its slug. */
export function getRoute(slug: string): Route | undefined {
  return routes.find((r) => r.slug === slug);
}
