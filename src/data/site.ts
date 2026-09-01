/**
 * Bike Bus Chico — site configuration
 * ------------------------------------
 * This is the ONE place to edit site-wide settings: name, domain, contact,
 * social links, navigation, and the reusable calls-to-action.
 *
 * Non-developers: it's safe to edit the text inside the quotes below.
 * When you have the real Discord and Instagram links, paste them in place
 * of the "#" placeholders.
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
  domain: 'https://bikebuschico.com',
  tagline: 'Ride to School Together',
  description:
    'Bike Bus Chico brings kids and families together to ride to school as a group — building community, confidence, and better mornings on two wheels.',
  contactEmail: 'hello@bikebuschico.com',

  /** Social + community links. Replace "#" with real URLs when you have them. */
  discordUrl: '#',
  instagramUrl: '#',

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
 * The header call-to-action. Joining the community (Discord) is the
 * single most important next step, so it lives in the header.
 */
export const headerCta: CallToAction = {
  label: 'Join the Community',
  href: site.discordUrl,
  external: true,
};

/**
 * The three primary actions, reused across the site via <CommunityCTA />.
 * Everything funnels toward one of these.
 */
export const primaryActions = {
  find: { label: 'Find a Bike Bus', href: '/routes/' } satisfies CallToAction,
  join: {
    label: 'Join the Community',
    href: site.discordUrl,
    external: true,
  } satisfies CallToAction,
  start: { label: 'Start a Bike Bus', href: '/start-a-route/' } satisfies CallToAction,
} as const;

/** Footer social links (only shown when a real URL is set). */
export const socialLinks: SocialLink[] = [
  { label: 'Discord', url: site.discordUrl },
  { label: 'Instagram', url: site.instagramUrl },
  { label: 'Email', url: `mailto:${site.contactEmail}` },
];
