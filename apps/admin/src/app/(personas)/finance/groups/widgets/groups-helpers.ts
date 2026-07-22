import type { CreateGroupForm } from './groups-types';

/**
 * Slugify a group name into a URL-safe slug. Mirrors the edge fn's
 * regex (lowercase alphanumerics with single hyphens between words).
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Fresh state for the "new group" dialog. */
export function initialCreateGroup(): CreateGroupForm {
  return {
    slug: '',
    name: '',
    description: '',
    startsOn: '',
    endsOn: '',
    showInSidebar: true,
  };
}
