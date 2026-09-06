'use server';

import { createServiceRoleClient } from '@shesa/supabase/service-role';
import { clientEnv } from '@shesa/config/env.client';

import { AUDIO, IMAGE, VIDEO, SHARED_PREFIX, type MediaKind } from './public-media';
import { requireMediaPermission } from './public-media';

/**
 * Hand the browser a one-time URL it can upload straight to Storage
 * with.
 *
 * The old path posted the file to a server action, which read it into
 * memory and forwarded it on. That works for a 200 KB logo and fails for
 * a 5 MB song: a serverless request body is capped well below Next's own
 * `bodySizeLimit` (4.5 MB on Vercel), and the request is rejected by the
 * platform before any of our code runs — which is why every attempt
 * failed with nothing useful in the logs.
 *
 * Going direct also halves the transfer. The file made two trips before,
 * browser → server → Storage, both over the uploader's connection for
 * the first leg; now it makes one.
 *
 * Authorisation still happens here, on the server: the signed URL is
 * issued only after the permission check, is good for one object at one
 * path, and expires.
 */

const KINDS: Record<string, MediaKind> = {
  image: IMAGE,
  video: VIDEO,
  audio: AUDIO,
};

export interface SignedUploadRequest {
  readonly bucket: string;
  /** Which allow-list to validate against: `image`, `video`, or `audio`. */
  readonly kind: keyof typeof KINDS;
  readonly fileName: string;
  readonly contentType: string;
  readonly size: number;
  /** Hex SHA-256 of the file, computed in the browser. Names the object. */
  readonly sha256: string;
  readonly permissionKey?: string;
}

export type SignedUploadResult =
  | {
      readonly ok: true;
      /** Already in Storage — nothing to upload, use this URL. */
      readonly deduped: true;
      readonly url: string;
      readonly path: string;
    }
  | {
      readonly ok: true;
      readonly deduped: false;
      readonly path: string;
      readonly token: string;
      readonly url: string;
    }
  | { readonly ok: false; readonly message: string };

function extensionFor(fileName: string, contentType: string): string {
  const fromName = /\.([a-zA-Z0-9]{1,5})$/.exec(fileName)?.[1];
  if (fromName) return `.${fromName.toLowerCase()}`;
  const subtype = contentType.split('/')[1];
  return subtype ? `.${subtype.replace(/[^a-z0-9]/gi, '').toLowerCase()}` : '';
}

export async function createSignedMediaUpload(
  req: SignedUploadRequest,
): Promise<SignedUploadResult> {
  const auth = await requireMediaPermission(req.permissionKey);
  if (!auth.ok) return { ok: false, message: auth.message };

  const kind = KINDS[req.kind];
  if (!kind) return { ok: false, message: 'Unknown media kind.' };

  if (!kind.mimeTypes.has(req.contentType)) {
    return {
      ok: false,
      message: `Unsupported file type "${req.contentType}". Use ${kind.accepts}.`,
    };
  }
  if (req.size <= 0) return { ok: false, message: 'File is empty.' };
  if (req.size > kind.maxBytes) {
    return {
      ok: false,
      message: `${kind.noun} must be under ${Math.round(kind.maxBytes / (1024 * 1024))} MB.`,
    };
  }
  if (!/^[0-9a-f]{64}$/.test(req.sha256)) {
    return { ok: false, message: 'Could not fingerprint the file.' };
  }

  const path = `${SHARED_PREFIX}/${req.sha256.slice(0, 2)}/${req.sha256}${extensionFor(
    req.fileName,
    req.contentType,
  )}`;

  const publicBase = clientEnv.NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, '');
  const url = `${publicBase}/storage/v1/object/public/${req.bucket}/${path}`;

  const service = createServiceRoleClient();

  // Already stored: the bytes are content-addressed, so an object at this
  // path is this file. Skip the transfer entirely — re-adding a track
  // that is already in the library becomes instant.
  const folder = path.slice(0, path.lastIndexOf('/'));
  const name = path.slice(path.lastIndexOf('/') + 1);
  const { data: existing } = await service.storage
    .from(req.bucket)
    .list(folder, { search: name, limit: 1 });
  if (existing?.some((entry) => entry.name === name)) {
    return { ok: true, deduped: true, url, path };
  }

  const { data, error } = await service.storage.from(req.bucket).createSignedUploadUrl(path);
  if (error || !data) {
    return { ok: false, message: error?.message ?? 'Could not start the upload.' };
  }

  return { ok: true, deduped: false, path, token: data.token, url };
}
