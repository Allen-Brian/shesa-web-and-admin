/**
 * Download helpers for gallery media.
 *
 * Same-origin files can rely on the browser's `download` attribute. For
 * cross-origin files (like external CDN videos) we have to fetch the
 * bytes ourselves and hand a Blob to the anchor, otherwise the browser
 * navigates instead of saving. Both paths funnel through `downloadUrl`.
 */

function isSameOrigin(url: string): boolean {
  if (typeof window === 'undefined') return true;
  try {
    if (url.startsWith('/')) return true;
    const parsed = new URL(url, window.location.href);
    return parsed.origin === window.location.origin;
  } catch {
    return false;
  }
}

function inferFilename(url: string, fallback: string): string {
  try {
    const parsed = new URL(url, 'https://x');
    const name = parsed.pathname.split('/').pop();
    if (name && name.includes('.')) return name;
  } catch {
    /* fall through */
  }
  return fallback;
}

export async function downloadUrl(url: string, suggestedName?: string) {
  if (typeof window === 'undefined') return;
  const filename = suggestedName ?? inferFilename(url, 'download');

  if (isSameOrigin(url)) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch {
    // CORS block or offline, open in a new tab as a last resort so the
    // user can still Save-As from the browser context menu.
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
