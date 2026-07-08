import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@shesa/config',
    '@shesa/domain',
    '@shesa/supabase',
    '@shesa/types',
    '@shesa/ui',
  ],
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    // Custom low-quality tier for the hero backdrop carousel — images
    // sit at ~22% opacity under a dark gradient, so quality={45} is
    // indistinguishable from quality={75} and roughly halves the bytes.
    qualities: [45, 75, 100],
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
