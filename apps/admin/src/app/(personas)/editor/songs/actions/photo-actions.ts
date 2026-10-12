'use server';

import { AUDIO, deletePublicObject, IMAGE, uploadPublicObject } from '@/lib/media/public-media';

const MEDIA_BUCKET = 'cms-media';
const AUDIO_BUCKET = 'cms-audio';
const PREFIX = 'songs';

/** Song cover art. Lives in cms-media alongside the other imagery. */
export async function uploadSongCover(formData: FormData) {
  return uploadPublicObject({ formData, bucket: MEDIA_BUCKET, prefix: PREFIX, accepts: [IMAGE] });
}

/** Best-effort delete of a cover. Silent on a stale or foreign URL. */
export async function deleteSongCover(publicUrl: string): Promise<void> {
  await deletePublicObject({ publicUrl, bucket: MEDIA_BUCKET, prefix: PREFIX });
}

/** The track itself. Separate bucket, 50 MB ceiling. */
export async function uploadSongAudio(formData: FormData) {
  return uploadPublicObject({ formData, bucket: AUDIO_BUCKET, prefix: PREFIX, accepts: [AUDIO] });
}

/** Best-effort delete of a track. Silent on a stale or foreign URL. */
export async function deleteSongAudio(publicUrl: string): Promise<void> {
  await deletePublicObject({ publicUrl, bucket: AUDIO_BUCKET, prefix: PREFIX });
}
