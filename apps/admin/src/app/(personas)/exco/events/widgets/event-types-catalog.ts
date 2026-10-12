/**
 * Single source of truth for event-type values shown in the create /
 * edit form and the events list filter. `EventTypeValue` is the string
 * literal union derived from `EVENT_TYPES`.
 */
export const EVENT_TYPES = [
  { value: 'sports', label: 'Sports' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'mentorship', label: 'Mentorship' },
  { value: 'assembly', label: 'Assembly (AGM / EGM)' },
  { value: 'networking', label: 'Networking' },
  { value: 'fundraiser', label: 'Fundraiser' },
  { value: 'community_service', label: 'Community Service' },
  { value: 'cultural', label: 'Cultural' },
  { value: 'training', label: 'Training' },
  { value: 'ceremony', label: 'Ceremony' },
  { value: 'celebration', label: 'Celebration' },
  { value: 'conference', label: 'Conference' },
  { value: 'other', label: 'Other' },
] as const;

export type EventTypeValue = (typeof EVENT_TYPES)[number]['value'];
