import { slugify as domainSlugify } from '@shesa/domain/utils';

import type { CreateGroupForm } from './groups-types';

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

/**
 * Slug for this surface, capped at 80 characters.
 *
 * The local copy this replaces skipped the diacritic strip, so accented
 * names slugged wrong — `Buéa` became `bu-a`. @shesa/domain/utils is the
 * single source named by frontend.md §6.
 */
export function slugify(input: string): string {
  return domainSlugify(input, 80);
}
