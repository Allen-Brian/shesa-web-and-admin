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
  experimental: {
    // CMS edits inside this app (Phase 5) will be Server Actions per
    // ADR-0033. The bodySizeLimit covers prose with embedded images.
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
