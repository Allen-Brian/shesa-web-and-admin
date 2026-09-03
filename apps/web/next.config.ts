import path from 'node:path';
import type { NextConfig } from 'next';

import { SECURITY_HEADERS } from '../../packages/config/src/security-headers.mjs';

/**
 * `next/image` whitelist. The public Leadership page renders leader
 * photos out of the `cms-media` bucket via URLs the Site Editor stored
 * when uploading. Host varies by environment:
 *   local Docker Supabase → 127.0.0.1:54321 (http)
 *   hosted Supabase       → <project>.supabase.co (https)
 * Production host is derived from NEXT_PUBLIC_SUPABASE_URL at build
 * time; local dev hosts are always included so the fresh-clone
 * experience works without a build-arg dance.
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
    formats: ['image/avif', 'image/webp'],
    // Custom low-quality tier for the hero backdrop carousel — images
    // sit at ~22% opacity under a dark gradient, so quality={45} is
    // indistinguishable from quality={75} and roughly halves the bytes.
    qualities: [45, 75, 100],
    remotePatterns: buildImageRemotePatterns(),
  },
  experimental: {
    // CMS edits inside this app (Phase 5) will be Server Actions per
    // ADR-0033. The bodySizeLimit covers prose with embedded images.
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
