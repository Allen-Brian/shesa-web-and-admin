/**
 * Authorization + safe deletion for the public Storage buckets.
 *
 * ─── Why this module exists ─────────────────────────────────────────
 * A Next.js Server Action is a public HTTP endpoint whose action id is
 * discoverable from the client bundle. When one opens a service-role
 * client — which bypasses RLS entirely — that action IS the whole
 * security boundary.
 *
 * Eight `delete*` media actions across the Editor surfaces did exactly
 * that with **no identity check at all**, taking the object path from a
 * caller-supplied URL. That let anyone, signed in or not, delete any
 * object in `cms-media`, `cms-audio` and `public-gallery` — every
 * article banner, leader photograph, gallery image and audio file on
 * the public site, with no undelete.
 *
 * The eight copies were near-identical, which is precisely why nobody
 * noticed the missing check while reading the ninth one. Centralising
 * the guard here means it cannot be forgotten on the tenth surface.
 * ────────────────────────────────────────────────────────────────────
 */

import { createServiceRoleClient } from '@shesa/supabase/service-role';

import { getServerClient } from '@/lib/supabase-server';

export interface MediaAuthOk {
  readonly ok: true;
  readonly userId: string;
}
export interface MediaAuthErr {
  readonly ok: false;
  readonly message: string;
}
export type MediaAuthResult = MediaAuthOk | MediaAuthErr;

/**
 * Require a signed-in caller holding `cms.edit` at any scope.
 *
 * `cms.edit` is the same key `/editor/layout.tsx` gates the whole
 * persona on, so this makes the actions agree with the surface that
 * hosts them. `has_permission_at_any_scope` is SECURITY DEFINER and
 * bypasses RLS on the RBAC tables.
 *
 * Callers that need a different key (event images want `event.create`)
 * pass it in.
 */
export async function requireMediaPermission(
  permissionKey: string = 'cms.edit',
): Promise<MediaAuthResult> {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: 'Not signed in.' };

  const { data: allowed, error } = await supabase
    .schema('core')
    .rpc('has_permission_at_any_scope', { p_user_id: user.id, p_key: permissionKey } as never);

  if (error) {
    // Fail closed, but say so distinctly — a checker outage should not
    // read as an ordinary permission denial.
    console.error(
      JSON.stringify({
        level: 'error',
        component: 'admin.media.requireMediaPermission',
        message: 'has_permission_at_any_scope failed',
        permissionKey,
        error: error.message,
      }),
    );
    return { ok: false, message: 'Could not verify your permissions. Please try again.' };
  }

  if (allowed !== true) {
    return { ok: false, message: 'You do not have permission to manage media.' };
  }

  return { ok: true, userId: user.id };
}

/**
 * Derive the object path from a public Storage URL, rejecting anything
 * that does not sit under the expected surface prefix.
 *
 * The prefix check is what stops a caller who *does* hold `cms.edit`
 * from reaching outside their surface, and the `..` / leading-slash
 * checks stop path traversal. Returns null when the URL does not belong
 * to this bucket and prefix — callers treat that as "nothing to do".
 */
export function derivePublicObjectPath(
  publicUrl: string,
  bucket: string,
  prefix: string,
): string | null {
  if (!publicUrl) return null;

  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx < 0) return null;

  const path = decodeURIComponent(publicUrl.slice(idx + marker.length)).split('?')[0] ?? '';
  if (!path) return null;

  // Traversal and absolute-path guards.
  if (path.includes('..') || path.startsWith('/')) return null;

  // Must sit under the surface that owns it.
  if (!path.startsWith(`${prefix}/`)) return null;

  return path;
}

/**
 * Authorize, then delete one object from a public bucket.
 *
 * Best-effort by design — a stale blob is preferable to a failed save,
 * and the reap job cleans orphans by prefix. But "best effort" applies
 * to the Storage call, never to the permission check.
 */
export async function deletePublicObject(args: {
  readonly publicUrl: string;
  readonly bucket: string;
  readonly prefix: string;
  readonly permissionKey?: string;
}): Promise<void> {
  const path = derivePublicObjectPath(args.publicUrl, args.bucket, args.prefix);
  if (!path) return;

  const auth = await requireMediaPermission(args.permissionKey);
  if (!auth.ok) {
    console.warn(
      JSON.stringify({
        level: 'warn',
        component: 'admin.media.deletePublicObject',
        message: 'refused unauthorized delete',
        bucket: args.bucket,
        prefix: args.prefix,
        reason: auth.message,
      }),
    );
    return;
  }

  const serviceClient = createServiceRoleClient();
  await serviceClient.storage.from(args.bucket).remove([path]);
}
