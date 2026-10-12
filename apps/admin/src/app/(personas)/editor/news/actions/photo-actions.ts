'use server';

import { deletePublicObject, IMAGE, uploadPublicObject } from '@/lib/media/public-media';

const BUCKET = 'cms-media';
const PREFIX = 'news';

/**
 * Article banner, author avatar, or an inline picture from the rich
 * editor. Path prefix `news/` so the orphan reap can key off it.
 */
export async function uploadArticleImage(formData: FormData) {
  return uploadPublicObject({ formData, bucket: BUCKET, prefix: PREFIX, accepts: [IMAGE] });
}

/** Best-effort delete. Silent on a stale or foreign URL. */
export async function deleteArticleImage(publicUrl: string): Promise<void> {
  await deletePublicObject({ publicUrl, bucket: BUCKET, prefix: PREFIX });
}
