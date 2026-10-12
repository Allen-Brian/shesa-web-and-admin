/**
 * Site-wide constants for the public web app, nav structure, brand copy,
 * and the AGM call-to-action target. Kept in one place so every page/nav
 * consumer stays in sync.
 */

export type NavItem = {
  readonly label: string;
  readonly href: string;
};

export const siteConfig = {
  name: 'SHESA',
  tagline: 'Alumni. United. Forever.',
  description:
    'The official home of the SHESA alumni community, reconnect, celebrate legacy, and shape what comes next.',
} as const;

/**
 * The Association's vision and mission, as issued by the President
 * General. One source for every surface that quotes them, so a revision
 * lands everywhere at once rather than being chased through components.
 *
 * The Strategic Plan carries its own wording of both in
 * `strategic-plan-content.ts` — that is a quotation from an adopted
 * document and is deliberately left as written.
 */
export const association = {
  vision:
    'To build a globally connected, influential, and inclusive SHESA network that empowers every SHESAN to thrive and create lasting societal impact.',
  mission:
    'To connect, empower, and mobilize SHESANs worldwide through lifelong engagement, professional development, mutual support, and collective action for better livelihood, advancement of SAHECO and nation building.',
} as const;

export const navItems: readonly NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Leadership', href: '/leadership' },
  { label: 'Organs', href: '/organs' },
  { label: 'News', href: '/news' },
  { label: 'Events', href: '/events' },
  { label: 'Projects', href: '/projects' },
  { label: 'Gallery', href: '/gallery' },
  { label: 'Songs', href: '/songs' },
  { label: 'Awards', href: '/awards' },
  // { label: 'Sponsors', href: '/sponsors' },
  { label: 'Partnership', href: '/agm-2026/sponsor' },
  { label: 'Contact Us', href: '/contact' },
] as const;

export const ctaItem: NavItem = {
  label: 'AGM 2026',
  href: '/agm-2026',
};
