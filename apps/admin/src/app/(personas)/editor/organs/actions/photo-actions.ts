'use server';

import { deletePublicObject, LOGO, uploadPublicObject } from '@/lib/media/public-media';

const BUCKET = 'cms-media';
const PREFIX = 'organs';

/**
 * Organ logo. Uses LOGO rather than IMAGE: SVG is wanted here (logos are
 * often vector) and the ceiling is 3 MB rather than 5.
 */
export async function uploadOrganLogo(formData: FormData) {
  return uploadPublicObject({ formData, bucket: BUCKET, prefix: PREFIX, accepts: [LOGO] });
}

/** Best-effort delete. Silent on a stale or foreign URL. */
export async function deleteOrganLogo(publicUrl: string): Promise<void> {
  await deletePublicObject({ publicUrl, bucket: BUCKET, prefix: PREFIX });
}
