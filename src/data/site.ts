/**
 * Bike Bus Chico — site configuration
 * ------------------------------------
 * This is the ONE place to edit site-wide settings: name, domain, contact,
 * social links, navigation, and the reusable calls-to-action.
 *
 * Non-developers: it's safe to edit the text inside the quotes below.
 */

export interface SocialLink {
  label: string;
  url: string;
}

export interface NavItem {
  label: string;
  href: string;
}

export interface CallToAction {
  label: string;
  href: string;
  /** When true, links to an external URL (opens in a new tab). */
  external?: boolean;
}

export const site = {
  name: 'Bike Bus Chico',
  domain: 'https://bikebuschico.org',
  tagline: 'Ride to School Together',
  description:
    'Bike Bus Chico brings kids and families together to ride to school as a group — building community, confidence, and better mornings on two wheels.',
  contactEmail: 'hello@bikebuschico.org',

  /** City / area context (used in copy and SEO). */
  location: 'Chico, California',
} as const;

/**
 * Primary navigation (revised IA).
 * Order matters — this is the header nav, left to right.
 */
export const nav: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Find a Bike Bus', href: '/routes/' },
  { label: 'Ride With Us', href: '/ride/' },
  { label: 'Start a Bike Bus', href: '/start-a-route/' },
  { label: 'About', href: '/about/' },
];

/**
 * The header call-to-action. Getting involved is the single most important
 * next step, so it lives in the header. It points to the routes list: you join
 * a Bike Bus by finding your route and contacting its ride leader directly.
 */
export const headerCta: CallToAction = {
  label: 'Get Involved',
  href: '/routes/',
};

/**
 * The three primary actions, reused across the site via <CommunityCTA />.
 * Everything funnels toward one of these.
 * - find / join both lead to the routes list (join = find your route, then
 *   reach its ride leader). Email (hello@) is reserved for new schools that
 *   want help starting their own route — see the Start a Bike Bus page.
 */
export const primaryActions = {
  find: { label: 'Find a Bike Bus', href: '/routes/' } satisfies CallToAction,
  join: {
    label: 'Get Involved',
    href: '/routes/',
  } satisfies CallToAction,
  start: { label: 'Start a Bike Bus', href: '/start-a-route/' } satisfies CallToAction,
} as const;

/** Footer links. Email is our public contact; community coordination is invite-only. */
export const socialLinks: SocialLink[] = [
  { label: 'Email', url: `mailto:${site.contactEmail}` },
];
