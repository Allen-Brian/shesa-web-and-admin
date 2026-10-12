'use server';

import { deletePublicObject, IMAGE, uploadPublicObject } from '@/lib/media/public-media';

const BUCKET = 'cms-media';
const PREFIX = 'leadership';

/** Portrait for a mainstream, branch, diaspora or batch leader. */
export async function uploadLeaderPhoto(formData: FormData) {
  return uploadPublicObject({ formData, bucket: BUCKET, prefix: PREFIX, accepts: [IMAGE] });
}

/** Best-effort delete. Silent on a stale or foreign URL. */
export async function deleteLeaderPhoto(publicUrl: string): Promise<void> {
  await deletePublicObject({ publicUrl, bucket: BUCKET, prefix: PREFIX });
}
