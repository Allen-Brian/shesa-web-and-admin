/**
 * Downloading a file the browser would rather play.
 *
 * ─── Why `<a download>` was not enough ─────────────────────────────────
 * The attribute is ignored for cross-origin URLs. Song audio is served
 * from Supabase Storage, a different origin from the site, so every
 * download button was really a link: the browser navigated to the file
 * and started streaming it in a bare tab. The control looked like it
 * worked, which is why it survived.
 *
 * Fetching the bytes and handing over a same-origin blob is what actually
 * saves the file. Supabase's public buckets send permissive CORS, so the
 * fetch is allowed.
 *
 * If it fails — offline, CORS changed, a very large file on a phone — the
 * old behaviour is the fallback. Opening the track is worse than saving
 * it and better than a button that does nothing.
 */

/** `Mbuh — Anthem.mp3` from a storage URL and a title. */
function fileNameFor(url: string, title: string): string {
  const fromUrl = url.split('?')[0]?.split('/').pop() ?? '';
  const ext = fromUrl.includes('.') ? fromUrl.slice(fromUrl.lastIndexOf('.')) : '';
  const safe = title.replace(/[^\w\s.-]/g, '').trim() || 'download';
  return `${safe}${ext}`;
}

export async function downloadFile(url: string, title: string): Promise<void> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = fileNameFor(url, title);
    document.body.appendChild(a);
    a.click();
    a.remove();

    // Revoked on the next tick: some browsers have not finished reading
    // the blob when click() returns, and revoking immediately cancels the
    // save it just started.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
