'use server';

import { deletePublicObject, IMAGE, uploadPublicObject, VIDEO } from '@/lib/media/public-media';

const BUCKET = 'cms-media';
const PREFIX = 'gallery';

/**
 * Album cover, photo, or a short video clip.
 *
 * Accepts both kinds and reports which matched, so the caller knows
 * whether to insert a `photo` or a `video` row without sniffing the MIME
 * type a second time.
 */
export async function uploadAlbumMedia(formData: FormData) {
  return uploadPublicObject({
    formData,
    bucket: BUCKET,
    prefix: PREFIX,
    accepts: [IMAGE, VIDEO],
  });
}

/** Best-effort delete. Silent on a stale or foreign URL. */
export async function deleteAlbumMedia(publicUrl: string): Promise<void> {
  await deletePublicObject({ publicUrl, bucket: BUCKET, prefix: PREFIX });
}
