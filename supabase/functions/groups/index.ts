/**
 * Entity Edge Function: groups/
 *
 * Serves /functions/v1/groups/{action}. Groups are mainstream-only
 * event lenses over finance.charges / payments / expenses; every
 * write lands here so we can enforce the scope invariant + audit
 * without RLS gymnastics on the client.
 *
 * Actions:
 *   create — inserts the group AND its default same-named donation
 *            campaign in one flow. If the campaign insert fails the
 *            group is rolled back so a group never ships without its
 *            default campaign.
 *   update — patches metadata + status transitions (active → closed
 *            → archived, no going back) + show-in-sidebar toggle.
 */

import { entityRouter } from '../_shared/entity-router.ts';

import { createGroup } from './create.ts';
import { updateGroup } from './update.ts';

Deno.serve(
  entityRouter({
    create: createGroup,
    update: updateGroup,
  }),
);
