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
  /** Ordered list of stops, first to last. */
  stops: RouteStop[];
  /** Optional: path to a route map image in /public/routes/. */
  mapImage?: string;
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
    routePdf: '/routes/hancock-park-route.pdf',
  },
  {
    slug: 'west-chico-ccds',
    name: 'West Chico → Chico Country Day School',
    school: 'Chico Country Day School',
    day: 'Fridays',
    startTime: '8:00 AM',
    arrivalTime: '8:15 AM',
    distance: '~1.5 miles',
    status: 'forming',
    summary:
      'A short, flat roll from the west side. We gather at the Warner St. Orchard, cruise past CSU Chico, and arrive together at Chico Country Day School — a quick, friendly ride that\u2019s perfect for newer riders.',
    stops: [
      {
        name: 'Warner St. Orchard',
        time: '8:00 AM',
        note: 'Gather a few minutes early — this is where we roll out.',
      },
      {
        name: 'CSU Chico Stop Sign',
        time: '8:08 AM',
      },
      {
        name: 'Chico Country Day School',
        time: '8:15 AM',
        note: 'Arrive together, with time to spare before the bell.',
      },
    ],
    mapImage: '/routes/west-chico-map.png',
  },
];

/** Look up a single route by its slug. */
export function getRoute(slug: string): Route | undefined {
  return routes.find((r) => r.slug === slug);
}
