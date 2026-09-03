/**
 * Track length for the song list and the audio picker.
 *
 * Lived in a file called `slugify.ts` alongside a copy of the shared
 * slugify — which is exactly the filename problem frontend.md §5 now
 * bans: nothing about the name suggested it also formatted durations.
 */

/** `217` → `"3:37"`. Null, zero and non-finite input render as an em dash. */
export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || !Number.isFinite(seconds)) return '—';
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}:${remainder.toString().padStart(2, '0')}`;
}
