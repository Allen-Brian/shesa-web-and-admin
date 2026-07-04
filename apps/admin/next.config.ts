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
