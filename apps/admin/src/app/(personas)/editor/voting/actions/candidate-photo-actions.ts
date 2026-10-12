'use server';

import { deletePublicObject, IMAGE, uploadPublicObject } from '@/lib/media/public-media';

/**
 * Candidate portraits.
 *
 * Same bucket and the same validated upload path as every other editor
 * image, under its own prefix so the whole cycle's photographs can be found
 * — and removed — together when the awards schema is eventually dropped.
 */
const BUCKET = 'cms-media';
const PREFIX = 'awards';

export async function uploadCandidatePhoto(formData: FormData) {
  return uploadPublicObject({ formData, bucket: BUCKET, prefix: PREFIX, accepts: [IMAGE] });
}

/** Best-effort delete. Silent on a stale or foreign URL. */
export async function deleteCandidatePhoto(publicUrl: string): Promise<void> {
  await deletePublicObject({ publicUrl, bucket: BUCKET, prefix: PREFIX });
}
