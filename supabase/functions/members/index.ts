/**
 * Entity Edge Function: members/
 *
 * Auto-migrated 2026-07-03 as part of the flat-to-entity reorg.
 * Each action lives in its own file; this router dispatches based
 * on the last URL path segment. See `_shared/entity-router.ts`.
 */

import { entityRouter } from '../_shared/entity-router.ts';

import { adminCorrectMember } from './admin-correct-member.ts';
import { createMember } from './create-member.ts';
import { updateMember } from './update-member.ts';
import { markMemberActive } from './mark-member-active.ts';
import { markMemberPassive } from './mark-member-passive.ts';
import { markRegistrationPaid } from './mark-registration-paid.ts';
import { sendInvite } from './send-invite.ts';

Deno.serve(
  entityRouter({
    'admin-correct-member': adminCorrectMember,
    'create-member': createMember,
    'update-member': updateMember,
    'mark-member-active': markMemberActive,
    'mark-member-passive': markMemberPassive,
    'mark-registration-paid': markRegistrationPaid,
    'send-invite': sendInvite,
  }),
);
