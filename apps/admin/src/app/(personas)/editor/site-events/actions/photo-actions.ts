'use server';

import { clientEnv } from '@shesa/config/env.client';
import { createServiceRoleClient } from '@shesa/supabase/service-role';

import { deletePublicObject, requireMediaPermission } from '@/lib/media/public-media';

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const BUCKET = 'cms-media';

interface UploadOk {
  readonly ok: true;
  readonly url: string;
  readonly path: string;
}
interface ActionErr {
  readonly ok: false;
  readonly message: string;
}

/**
 * Upload an event-scoped image (banner, flyer, inline body picture
 * from the Quill editor). Path convention:
 * `site-events/{user_id}/{ts}-{name}`. Same validation as the other
 * CMS surfaces; different prefix keeps reap-cleanup auditable per
 * surface.
 */
export async function uploadEventImage(formData: FormData): Promise<UploadOk | ActionErr> {
  const auth = await requireMediaPermission();
  if (!auth.ok) return auth;
  const user = { id: auth.userId };

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

  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 80);
  const path = `site-events/${user.id}/${Date.now()}-${cleanName}`;

  const serviceClient = createServiceRoleClient();
  const { error: upErr } = await serviceClient.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: '3600',
    upsert: false,
  });
  if (upErr) return { ok: false, message: upErr.message ?? 'Could not upload the image.' };

  const publicBase = clientEnv.NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, '');
  const url = `${publicBase}/storage/v1/object/public/${BUCKET}/${path}`;
  return { ok: true, url, path };
}

/** Best-effort delete of an event-scoped image. Silent on failure. */
export async function deleteEventImage(publicUrl: string): Promise<void> {
  await deletePublicObject({
    publicUrl,
    bucket: BUCKET,
    prefix: 'site-events',
  });
}
