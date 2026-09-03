'use server';

import { deletePublicObject, IMAGE, uploadPublicObject } from '@/lib/media/public-media';

const BUCKET = 'cms-media';
const PREFIX = 'projects';

/** Project banner or an inline picture from the rich editor. */
export async function uploadProjectImage(formData: FormData) {
  return uploadPublicObject({ formData, bucket: BUCKET, prefix: PREFIX, accepts: [IMAGE] });
}

/** Best-effort delete. Silent on a stale or foreign URL. */
export async function deleteProjectImage(publicUrl: string): Promise<void> {
  await deletePublicObject({ publicUrl, bucket: BUCKET, prefix: PREFIX });
}
