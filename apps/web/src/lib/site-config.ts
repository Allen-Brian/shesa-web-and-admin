/**
 * Site-wide constants for the public web app — nav structure, brand copy,
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
    'The official home of the SHESA alumni community — reconnect, celebrate legacy, and shape what comes next.',
} as const;

export const navItems: readonly NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Leadership', href: '/leadership' },
  { label: 'Organs', href: '/organs' },
  { label: 'News & Announcements', href: '/news' },
  { label: 'Events', href: '/events' },
  { label: 'Projects', href: '/projects' },
  { label: 'Gallery', href: '/gallery' },
  { label: 'Sponsors', href: '/sponsors' },
  { label: 'Contact Us', href: '/contact' },
] as const;

export const ctaItem: NavItem = {
  label: 'AGM 2026',
  href: '/agm-2026',
};
