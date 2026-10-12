/**
 * True when the URL points at a local-Docker Supabase host that the
 * Next.js server can't reach from inside its own container.
 *
 * `next/image`'s server-side optimizer fetches the source URL, resizes,
 * and re-encodes. When the web container runs in Docker and the src is
 * `http://127.0.0.1:54321/…`, the container's own `127.0.0.1` refuses
 * the connection (the Supabase container lives on the host, not inside
 * shesa-web). Passing `unoptimized` for these URLs lets the browser
 * fetch the bytes directly, the browser IS on the host and resolves
 * the loopback correctly.
 *
 * Production URLs (`<project>.supabase.co`) stay optimized because the
 * Next.js server can reach public Supabase over the internet.
 */
export function isLocalSupabaseUrl(src: string): boolean {
  return /^https?:\/\/(127\.0\.0\.1|localhost)(?::\d+)?\//i.test(src);
}
