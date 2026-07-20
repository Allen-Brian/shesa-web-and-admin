'use server';

import { clientEnv } from '@shesa/config/env.client';
import { createServiceRoleClient } from '@shesa/supabase/service-role';

import { getServerClient } from '@/lib/supabase-server';

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
 * Upload a project-scoped image (banner, inline body picture from the
 * Quill editor). Path convention: `projects/{user_id}/{ts}-{name}`.
 * Same validation as the leadership + news actions; the different path
 * prefix keeps reap-cleanup logic auditable per surface.
 */
export async function uploadProjectImage(formData: FormData): Promise<UploadOk | ActionErr> {
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

  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 80);
  const path = `projects/${user.id}/${Date.now()}-${cleanName}`;

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

/** Best-effort delete of a project-scoped image. Silent on failure. */
export async function deleteProjectImage(publicUrl: string): Promise<void> {
  if (!publicUrl) return;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx < 0) return;
  const path = publicUrl.slice(idx + marker.length);
  if (!path) return;
  const serviceClient = createServiceRoleClient();
  await serviceClient.storage.from(BUCKET).remove([path]);
}
