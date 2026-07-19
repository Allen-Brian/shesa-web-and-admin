'use server';

import { clientEnv } from '@shesa/config/env.client';
import { createServiceRoleClient } from '@shesa/supabase/service-role';

import { getServerClient } from '@/lib/supabase-server';

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // matches the bucket file_size_limit

/**
 * Upload a single advert image for an event. Called from the
 * EventImagesPicker's onChange. Returns a public CDN URL the form
 * embeds into the hidden `advertImageUrlsJson` payload.
 *
 * Auth model: the caller must be signed in (getServerClient reads
 * the session cookie). Beyond that, uploads land in an
 * uploader-scoped folder in the public `event-advert-images` bucket
 * — the caller can only overwrite their own path. When we wire the
 * events/create Edge Function to associate images to a specific
 * event, unreferenced uploads become reap candidates for a
 * scheduled cleanup job.
 */
export async function uploadEventAdvertImage(
  formData: FormData,
): Promise<{ ok: true; url: string; path: string } | { ok: false; message: string }> {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: 'Not signed in.' };

  const file = formData.get('file');
  if (!(file instanceof File)) return { ok: false, message: 'No file supplied.' };
  if (file.size === 0) return { ok: false, message: 'File is empty.' };
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, message: 'Image must be under 5 MB.' };
  }
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return {
      ok: false,
      message: `Unsupported file type "${file.type}". Use JPEG, PNG, WebP, or AVIF.`,
    };
  }

  // Path convention: {user_id}/{timestamp}-{sanitized-name}
  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 80);
  const path = `${user.id}/${Date.now()}-${cleanName}`;

  const serviceClient = createServiceRoleClient();
  const { error: upErr } = await serviceClient.storage
    .from('event-advert-images')
    .upload(path, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    });

  if (upErr) {
    return {
      ok: false,
      message: upErr.message ?? 'Could not upload the image.',
    };
  }

  // Build the URL from the client-facing base rather than the
  // Storage SDK's getPublicUrl. In local Docker dev the admin server
  // reaches Supabase over an internal hostname (host.docker.internal),
  // and getPublicUrl would bake that into the URL — unreachable from
  // the browser. NEXT_PUBLIC_SUPABASE_URL is always the browser-facing
  // origin, on every environment.
  const publicBase = clientEnv.NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, '');
  const url = `${publicBase}/storage/v1/object/public/event-advert-images/${path}`;
  return { ok: true, url, path };
}
