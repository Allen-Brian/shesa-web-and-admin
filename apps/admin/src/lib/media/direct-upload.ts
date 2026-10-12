'use client';

import { getBrowserClient } from '@/lib/supabase-browser';

import { createSignedMediaUpload } from './signed-upload';

/**
 * Upload a file straight from the browser to Storage.
 *
 * The server issues a one-time signed URL after checking permissions;
 * the bytes never pass through it. That removes the serverless request
 * body limit that made anything over ~4.5 MB fail, and halves the
 * transfer — one leg instead of two.
 */

export interface DirectUploadOk {
  readonly ok: true;
  readonly url: string;
  readonly path: string;
  /** True when the file was already stored and nothing was transferred. */
  readonly deduped: boolean;
}

export type DirectUploadResult = DirectUploadOk | { readonly ok: false; readonly message: string };

/** Hex SHA-256 of the file, used as its name in Storage. */
async function sha256Hex(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function uploadDirect(args: {
  readonly file: File;
  readonly bucket: string;
  readonly kind: 'image' | 'video' | 'audio';
  readonly permissionKey?: string;
}): Promise<DirectUploadResult> {
  const { file, bucket, kind, permissionKey } = args;

  let hash: string;
  try {
    hash = await sha256Hex(file);
  } catch {
    return { ok: false, message: 'Could not read the file.' };
  }

  const signed = await createSignedMediaUpload({
    bucket,
    kind,
    fileName: file.name,
    contentType: file.type,
    size: file.size,
    sha256: hash,
    permissionKey,
  });

  if (!signed.ok) return signed;

  // Same bytes already in the bucket: nothing to send.
  if (signed.deduped) {
    return { ok: true, url: signed.url, path: signed.path, deduped: true };
  }

  const supabase = getBrowserClient();
  const { error } = await supabase.storage
    .from(bucket)
    .uploadToSignedUrl(signed.path, signed.token, file, {
      contentType: file.type,
      // Content-addressed names never point at different bytes, so this
      // can be cached for a year.
      cacheControl: '31536000',
    });

  if (error) {
    return { ok: false, message: error.message || 'The upload did not complete.' };
  }

  return { ok: true, url: signed.url, path: signed.path, deduped: false };
}
