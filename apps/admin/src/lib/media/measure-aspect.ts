/**
 * Work out which stored aspect ratio a picture actually is.
 *
 * `cms.gallery_media.aspect` is constrained to seven ratios, and the
 * uploader used to guess `4/3` for every image regardless of shape. A
 * portrait photo stored as `4/3` is then rendered into a landscape box
 * and cropped, which is exactly the "pictures get cut" complaint.
 *
 * Measuring the file and snapping to the nearest allowed ratio keeps the
 * crop to the small difference between the real shape and its closest
 * bucket, rather than the whole difference between portrait and
 * landscape. Storing exact pixel dimensions would remove even that, but
 * it needs a column the schema does not have yet.
 */

/**
 * The ratios `gallery_media_aspect_check` permits. Kept structurally
 * identical to `MediaAspect` in the gallery actions so a measurement
 * drops straight into a media row.
 */
export type AspectRatio = '1/1' | '3/4' | '4/3' | '3/2' | '2/3' | '16/9' | '9/16';

/** Every allowed ratio, with its value. */
const ALLOWED: readonly (readonly [AspectRatio, number])[] = [
  ['9/16', 9 / 16],
  ['2/3', 2 / 3],
  ['3/4', 3 / 4],
  ['1/1', 1],
  ['4/3', 4 / 3],
  ['3/2', 3 / 2],
  ['16/9', 16 / 9],
] as const;

const FALLBACK: AspectRatio = '4/3';

/** The allowed ratio closest to `width / height`. */
export function nearestAspect(width: number, height: number): AspectRatio {
  if (!width || !height) return FALLBACK;
  const actual = width / height;

  let best: AspectRatio = FALLBACK;
  let bestDelta = Number.POSITIVE_INFINITY;
  for (const [label, value] of ALLOWED) {
    // Compared in log space so being 30% too wide and 30% too tall are
    // treated as equally wrong; a linear comparison favours landscape.
    const delta = Math.abs(Math.log(actual / value));
    if (delta < bestDelta) {
      bestDelta = delta;
      best = label;
    }
  }
  return best;
}

/**
 * Decode an image file far enough to read its dimensions. Returns the
 * fallback when the browser cannot decode it (an unusual format, or a
 * video handed in by mistake) — never throws, because a bad measurement
 * must not block the upload.
 */
export async function measureImageAspect(file: File): Promise<AspectRatio> {
  if (typeof createImageBitmap !== 'function') return FALLBACK;
  try {
    const bitmap = await createImageBitmap(file);
    const aspect = nearestAspect(bitmap.width, bitmap.height);
    bitmap.close();
    return aspect;
  } catch {
    return FALLBACK;
  }
}
