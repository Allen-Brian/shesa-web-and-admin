'use server';

import { deletePublicObject, IMAGE, uploadPublicObject } from '@/lib/media/public-media';

const BUCKET = 'cms-media';
const PREFIX = 'site-events';

/** Site-event banner or flyer image. */
export async function uploadEventImage(formData: FormData) {
  return uploadPublicObject({ formData, bucket: BUCKET, prefix: PREFIX, accepts: [IMAGE] });
}

/** Best-effort delete. Silent on a stale or foreign URL. */
export async function deleteEventImage(publicUrl: string): Promise<void> {
  await deletePublicObject({ publicUrl, bucket: BUCKET, prefix: PREFIX });
}
