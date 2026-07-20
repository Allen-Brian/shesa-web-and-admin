'use server';

import { clientEnv } from '@shesa/config/env.client';
import { createServiceRoleClient } from '@shesa/supabase/service-role';

import { getServerClient } from '@/lib/supabase-server';

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const ALLOWED_AUDIO_TYPES = new Set([
  'audio/mpeg', // .mp3
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/ogg',
  'audio/webm',
  'audio/aac',
  'audio/mp4', // .m4a
]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_AUDIO_BYTES = 50 * 1024 * 1024;

const MEDIA_BUCKET = 'cms-media';
const AUDIO_BUCKET = 'cms-audio';

interface UploadOk {
  readonly ok: true;
  readonly url: string;
  readonly path: string;
}
interface ActionErr {
  readonly ok: false;
  readonly message: string;
}

/** Cover image for a song. Path: `songs/{user_id}/{ts}-{name}` in cms-media. */
export async function uploadSongCover(formData: FormData): Promise<UploadOk | ActionErr> {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: 'Not signed in.' };

  const file = formData.get('file');
  if (!(file instanceof File)) return { ok: false, message: 'No file supplied.' };
  if (file.size === 0) return { ok: false, message: 'File is empty.' };
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, message: 'Cover must be under 5 MB.' };
  }
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return {
      ok: false,
      message: `Unsupported file type "${file.type}". Use JPEG, PNG, WebP, or AVIF.`,
    };
  }

  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 80);
  const path = `songs/${user.id}/${Date.now()}-${cleanName}`;

  const serviceClient = createServiceRoleClient();
  const { error: upErr } = await serviceClient.storage.from(MEDIA_BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: '3600',
    upsert: false,
  });
  if (upErr) return { ok: false, message: upErr.message ?? 'Could not upload the cover.' };

  const publicBase = clientEnv.NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, '');
  const url = `${publicBase}/storage/v1/object/public/${MEDIA_BUCKET}/${path}`;
  return { ok: true, url, path };
}

/** Best-effort delete of a song cover (cms-media). */
export async function deleteSongCover(publicUrl: string): Promise<void> {
  if (!publicUrl) return;
  const marker = `/storage/v1/object/public/${MEDIA_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx < 0) return;
  const path = publicUrl.slice(idx + marker.length);
  if (!path) return;
  const serviceClient = createServiceRoleClient();
  await serviceClient.storage.from(MEDIA_BUCKET).remove([path]);
}

/**
 * Audio file for a song. Path: `songs/{user_id}/{ts}-{name}` in the
 * dedicated `cms-audio` bucket. Enforces a 50 MB ceiling per file.
 */
export async function uploadSongAudio(formData: FormData): Promise<UploadOk | ActionErr> {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: 'Not signed in.' };

  const file = formData.get('file');
  if (!(file instanceof File)) return { ok: false, message: 'No file supplied.' };
  if (file.size === 0) return { ok: false, message: 'File is empty.' };
  if (file.size > MAX_AUDIO_BYTES) {
    return { ok: false, message: 'Audio must be under 50 MB.' };
  }
  if (!ALLOWED_AUDIO_TYPES.has(file.type)) {
    return {
      ok: false,
      message: `Unsupported audio type "${file.type}". Use MP3, WAV, OGG, or M4A.`,
    };
  }

  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 80);
  const path = `songs/${user.id}/${Date.now()}-${cleanName}`;

  const serviceClient = createServiceRoleClient();
  const { error: upErr } = await serviceClient.storage.from(AUDIO_BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: '3600',
    upsert: false,
  });
  if (upErr) return { ok: false, message: upErr.message ?? 'Could not upload the audio.' };

  const publicBase = clientEnv.NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, '');
  const url = `${publicBase}/storage/v1/object/public/${AUDIO_BUCKET}/${path}`;
  return { ok: true, url, path };
}

/** Best-effort delete of a song audio file (cms-audio). */
export async function deleteSongAudio(publicUrl: string): Promise<void> {
  if (!publicUrl) return;
  const marker = `/storage/v1/object/public/${AUDIO_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx < 0) return;
  const path = publicUrl.slice(idx + marker.length);
  if (!path) return;
  const serviceClient = createServiceRoleClient();
  await serviceClient.storage.from(AUDIO_BUCKET).remove([path]);
}
