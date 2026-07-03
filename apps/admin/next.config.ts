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
    // attached CSVs) run directly through the server supabase client
    // and can carry small payloads. 2mb covers a couple of MB of CSV
    // + prose — anything larger goes through direct-to-storage upload.
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
