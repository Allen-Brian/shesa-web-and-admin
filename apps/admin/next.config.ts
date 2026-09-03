import path from 'node:path';
import type { NextConfig } from 'next';

import { SECURITY_HEADERS } from '../../packages/config/src/security-headers.mjs';

/**
 * `next/image` whitelist. The Site Editor's leader photo picker uploads
 * to the `cms-media` bucket and stores the returned public URL; the
 * table + dialog previews render those URLs through `next/image`,
 * which needs the host whitelisted here.
 *
 * The bucket URL host varies by environment:
 *   local Docker Supabase → 127.0.0.1:54321 (http)
 *   hosted Supabase       → <project>.supabase.co (https)
 * We derive the production host from NEXT_PUBLIC_SUPABASE_URL and
 * always include the two local dev hosts so the fresh-clone experience
 * works without a build-arg dance.
 */
function buildImageRemotePatterns() {
  const patterns: NonNullable<NextConfig['images']>['remotePatterns'] = [
    { protocol: 'http', hostname: '127.0.0.1', port: '54321', pathname: '/storage/v1/object/**' },
    { protocol: 'http', hostname: 'localhost', port: '54321', pathname: '/storage/v1/object/**' },
  ];
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (raw) {
    try {
      const u = new URL(raw);
      const host = u.hostname;
      const isLocal = host === '127.0.0.1' || host === 'localhost';
      if (!isLocal) {
        patterns.push({
          protocol: u.protocol.replace(':', '') as 'http' | 'https',
          hostname: host,
          pathname: '/storage/v1/object/**',
        });
      }
    } catch {
      // ignore — build continues with the local-only fallback
    }
  }
  return patterns;
}

const nextConfig: NextConfig = {
  // Vercel monorepo builds: trace files from the workspace root so
  // @shesa/* package sources are included in the deploy bundle.
  outputFileTracingRoot: path.join(__dirname, '../..'),
  transpilePackages: [
    '@shesa/config',
    '@shesa/domain',
    '@shesa/supabase',
    '@shesa/types',
    '@shesa/ui',
  ],
  reactStrictMode: true,

  /**
   * SEC-18 — response security headers on every route. The list and the
   * reasoning live in `@shesa/config/security-headers` so both apps stay
   * in step.
   */
  async headers() {
    return [{ source: '/:path*', headers: [...SECURITY_HEADERS] }];
  },

  images: {
    remotePatterns: buildImageRemotePatterns(),
  },
  experimental: {
    // Most admin mutations flow Server Action -> Edge Function (ADR-0033).
    // A few (profile-owned single-row updates, member imports with
    // attached CSVs, event advert-image uploads) run directly through
    // the server supabase client. Bumped to 20mb to accept the
    // event-advert-images path — the bucket itself caps individual
    // files at 5mb, so this leaves headroom for a multi-file
    // selection sent through one action call.
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
};

export default nextConfig;
