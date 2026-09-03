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

import { clientEnv } from '@shesa/config/env.client';
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

  // Must sit under the surface that owns it. An empty prefix means the
  // bucket has no surface folder, so there is nothing further to check.
  if (prefix && !path.startsWith(`${prefix}/`)) return null;

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

/* ══════════════════════════════════════════════════════════════════════
 * Uploads
 * ══════════════════════════════════════════════════════════════════════
 * Nine upload actions across seven surfaces were the same forty lines
 * with a different prefix and a different error string. They are now
 * one call each.
 */

/** One acceptable class of file for an upload: what it is, and its ceiling. */
export interface MediaKind {
  /** Returned to the caller so a mixed-media picker can branch on it. */
  readonly kind: string;
  readonly mimeTypes: ReadonlySet<string>;
  readonly maxBytes: number;
  /** Used in the size error: "Image must be under 5 MB." */
  readonly noun: string;
  /** Used in the type error: "Use JPEG, PNG, WebP, or AVIF." */
  readonly accepts: string;
}

const MB = 1024 * 1024;

export const IMAGE: MediaKind = {
  kind: 'photo',
  mimeTypes: new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  maxBytes: 5 * MB,
  noun: 'Image',
  accepts: 'JPEG, PNG, WebP, or AVIF',
};

/** Logos, where SVG is wanted and the ceiling is lower. */
export const LOGO: MediaKind = {
  ...IMAGE,
  mimeTypes: new Set([...IMAGE.mimeTypes, 'image/svg+xml']),
  maxBytes: 3 * MB,
  noun: 'Logo',
  accepts: 'JPEG, PNG, WebP, AVIF, or SVG',
};

export const VIDEO: MediaKind = {
  kind: 'video',
  mimeTypes: new Set(['video/mp4', 'video/webm', 'video/quicktime']),
  maxBytes: 100 * MB,
  noun: 'Video',
  accepts: 'MP4, WebM, or MOV',
};

export const AUDIO: MediaKind = {
  kind: 'audio',
  mimeTypes: new Set([
    'audio/mpeg', // .mp3
    'audio/mp3',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/ogg',
    'audio/webm',
    'audio/aac',
    'audio/mp4', // .m4a
  ]),
  maxBytes: 50 * MB,
  noun: 'Audio',
  accepts: 'MP3, WAV, OGG, or M4A',
};

export interface UploadOk {
  readonly ok: true;
  readonly url: string;
  readonly path: string;
  /** Which `MediaKind` matched — lets a mixed picker pick its insert. */
  readonly kind: string;
}

export type UploadResult = UploadOk | MediaAuthErr;

/**
 * Authorize, validate, and upload one file to a public bucket.
 *
 * Object path is `{prefix}/{uploader_id}/{timestamp}-{sanitised-name}`,
 * so uploads are attributable and orphans are reapable by prefix.
 *
 * A note on `file.type`: it is the browser-declared MIME from the
 * multipart part, not a content sniff, so the allow-list constrains
 * honest clients rather than hostile ones. The real boundary is the
 * permission check above it and the bucket's own size limit below.
 */
export async function uploadPublicObject(args: {
  readonly formData: FormData;
  readonly bucket: string;
  readonly prefix: string;
  readonly accepts: readonly MediaKind[];
  readonly permissionKey?: string;
}): Promise<UploadResult> {
  const auth = await requireMediaPermission(args.permissionKey);
  if (!auth.ok) return auth;

  const file = args.formData.get('file');
  if (!(file instanceof File)) return { ok: false, message: 'No file supplied.' };
  if (file.size === 0) return { ok: false, message: 'File is empty.' };

  const match = args.accepts.find((k) => k.mimeTypes.has(file.type));
  if (!match) {
    const wanted = args.accepts.map((k) => k.accepts).join('; or ');
    return { ok: false, message: `Unsupported file type "${file.type}". Use ${wanted}.` };
  }
  if (file.size > match.maxBytes) {
    const mb = Math.round(match.maxBytes / MB);
    return { ok: false, message: `${match.noun} must be under ${mb} MB.` };
  }

  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 80);
  // An empty prefix means the bucket is uploader-scoped with no surface
  // folder (event-advert-images). Joining unconditionally would give the
  // object a leading slash.
  const folder = args.prefix ? `${args.prefix}/${auth.userId}` : auth.userId;
  const path = `${folder}/${Date.now()}-${cleanName}`;

  const serviceClient = createServiceRoleClient();
  const { error } = await serviceClient.storage.from(args.bucket).upload(path, file, {
    contentType: file.type,
    cacheControl: '3600',
    upsert: false,
  });
  if (error) return { ok: false, message: error.message ?? 'Could not upload the file.' };

  // Built from the browser-facing origin rather than the Storage SDK's
  // getPublicUrl: in local Docker the server reaches Supabase over an
  // internal hostname, which getPublicUrl would bake into the URL.
  const publicBase = clientEnv.NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, '');
  return {
    ok: true,
    url: `${publicBase}/storage/v1/object/public/${args.bucket}/${path}`,
    path,
    kind: match.kind,
  };
}
