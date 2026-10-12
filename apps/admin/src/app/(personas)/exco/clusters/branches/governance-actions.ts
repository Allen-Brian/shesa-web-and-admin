'use server';

import { revalidatePath } from 'next/cache';

import { extractInvokeMessage } from '@/lib/edge-invoke';
import { getServerClient } from '@/lib/supabase-server';

/**
 * Branch-scoped governance Server Actions. Each one invokes the
 * matching Edge Function in `positions/` or `roles/` and revalidates
 * the branch's detail page so the Governance tab picks up the change.
 *
 * Position ↔ Role linkage: `assignPositionWithRole` runs both calls
 * sequentially. Position always tries first (it never depends on
 * an auth account); the role grant runs only if `alsoGrantRoleKey`
 * is present and reports its result independently so a partial
 * success ("position assigned; role grant failed") is honest.
 */

export interface ActionResult {
  readonly ok: boolean;
  readonly message?: string;
  readonly warning?: string;
}

export async function assignPositionWithRole(input: {
  scopeId: string;
  memberId: string;
  positionCatalogId: string;
  /** Optional companion role grant. Requires the member to have a linked auth account. */
  alsoGrantRole?: {
    userId: string;
    roleKey: string;
  } | null;
}): Promise<ActionResult> {
  const supabase = await getServerClient();

  const { error: posErr } = await supabase.functions.invoke('positions/assign-position', {
    body: {
      memberId: input.memberId,
      scopeId: input.scopeId,
      positionCatalogId: input.positionCatalogId,
    },
  });
  if (posErr) {
    return {
      ok: false,
      message: await extractInvokeMessage(posErr, 'Could not assign the position.'),
    };
  }

  let warning: string | undefined;
  if (input.alsoGrantRole) {
    const { error: roleErr } = await supabase.functions.invoke('roles/grant-role', {
      body: {
        userId: input.alsoGrantRole.userId,
        scopeId: input.scopeId,
        roleKey: input.alsoGrantRole.roleKey,
      },
    });
    if (roleErr) {
      warning = await extractInvokeMessage(
        roleErr,
        'Position assigned, but the role grant failed. Try granting the role separately.',
      );
    }
  }

  revalidatePath('/exco/clusters', 'layout');
  return { ok: true, warning };
}

export async function removePosition(assignmentId: string): Promise<ActionResult> {
  const supabase = await getServerClient();
  const { error } = await supabase.functions.invoke('positions/remove-position', {
    body: { assignmentId },
  });
  if (error) {
    return {
      ok: false,
      message: await extractInvokeMessage(error, 'Could not remove the position.'),
    };
  }
  revalidatePath('/exco/clusters', 'layout');
  return { ok: true };
}

export async function grantRole(input: {
  scopeId: string;
  userId: string;
  roleKey: string;
}): Promise<ActionResult> {
  const supabase = await getServerClient();
  const { error } = await supabase.functions.invoke('roles/grant-role', {
    body: {
      userId: input.userId,
      scopeId: input.scopeId,
      roleKey: input.roleKey,
    },
  });
  if (error) {
    return { ok: false, message: await extractInvokeMessage(error, 'Could not grant the role.') };
  }
  revalidatePath('/exco/clusters', 'layout');
  return { ok: true };
}

export async function revokeRole(assignmentId: string): Promise<ActionResult> {
  const supabase = await getServerClient();
  const { error } = await supabase.functions.invoke('roles/revoke-role', {
    body: { assignmentId },
  });
  if (error) {
    return { ok: false, message: await extractInvokeMessage(error, 'Could not revoke the role.') };
  }
  revalidatePath('/exco/clusters', 'layout');
  return { ok: true };
}

/**
 * Adds a new entry to the position catalog for a given scope_type
 * (mainstream / branch / chapter / batch). RLS on the Edge Function
 * enforces `scope.manage_capabilities` at Mainstream — this is a
 * mainstream_admin-only action; the catalog is federation-wide.
 */
export async function createPositionCatalogEntry(input: {
  scopeType: 'mainstream' | 'branch' | 'chapter' | 'batch';
  name: string;
  description: string | null;
  sortOrder: number;
}): Promise<ActionResult> {
  const supabase = await getServerClient();
  const { error } = await supabase.functions.invoke('positions/create-position-catalog-entry', {
    body: {
      scopeType: input.scopeType,
      name: input.name,
      description: input.description,
      sortOrder: input.sortOrder,
    },
  });
  if (error) {
    return {
      ok: false,
      message: await extractInvokeMessage(error, 'Could not create the position.'),
    };
  }
  revalidatePath('/exco/settings', 'layout');
  revalidatePath('/exco/clusters', 'layout');
  return { ok: true };
}
