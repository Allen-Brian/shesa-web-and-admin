'use server';

import { clientEnv } from '@shesa/config/env.client';
import { createServiceRoleClient } from '@shesa/supabase/service-role';

import { getServerClient } from '@/lib/supabase-server';

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB — same as other surfaces
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB — self-hosted album clips

const BUCKET = 'cms-media';

interface UploadOk {
  readonly ok: true;
  readonly url: string;
  readonly path: string;
  readonly kind: 'photo' | 'video';
}
interface ActionErr {
  readonly ok: false;
  readonly message: string;
}

/**
 * Upload a gallery-scoped file (album cover, photo, or short video clip).
 * Path convention: `gallery/{user_id}/{ts}-{name}`. Same reap-cleanup
 * convention as the other CMS surfaces.
 *
 * The `kind` is decided from the file's MIME type — images route through
 * the image validator, videos through the video validator. The returned
 * `kind` tells the client which insert to make (`photo` vs `video`) so
 * the media grid can pick the right renderer.
 */
export async function uploadAlbumMedia(formData: FormData): Promise<UploadOk | ActionErr> {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: 'Not signed in.' };

  const file = formData.get('file');
  if (!(file instanceof File)) return { ok: false, message: 'No file supplied.' };
  if (file.size === 0) return { ok: false, message: 'File is empty.' };

  const isImage = ALLOWED_IMAGE_TYPES.has(file.type);
  const isVideo = ALLOWED_VIDEO_TYPES.has(file.type);
  if (!isImage && !isVideo) {
    return {
      ok: false,
      message: `Unsupported file type "${file.type}". Use JPEG, PNG, WebP, AVIF, MP4, WebM, or MOV.`,
    };
  }
  if (isImage && file.size > MAX_IMAGE_BYTES) {
    return { ok: false, message: 'Image must be under 5 MB.' };
  }
  if (isVideo && file.size > MAX_VIDEO_BYTES) {
    return { ok: false, message: 'Video must be under 100 MB.' };
  }

  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 80);
  const path = `gallery/${user.id}/${Date.now()}-${cleanName}`;

  const serviceClient = createServiceRoleClient();
  const { error: upErr } = await serviceClient.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: '3600',
    upsert: false,
  });
  if (upErr) return { ok: false, message: upErr.message ?? 'Could not upload the file.' };

  const publicBase = clientEnv.NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, '');
  const url = `${publicBase}/storage/v1/object/public/${BUCKET}/${path}`;
  return { ok: true, url, path, kind: isImage ? 'photo' : 'video' };
}

/** Best-effort delete of a gallery-scoped file. Silent on failure. */
export async function deleteAlbumMedia(publicUrl: string): Promise<void> {
  if (!publicUrl) return;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx < 0) return;
  const path = publicUrl.slice(idx + marker.length);
  if (!path) return;
  const serviceClient = createServiceRoleClient();
  await serviceClient.storage.from(BUCKET).remove([path]);
}
