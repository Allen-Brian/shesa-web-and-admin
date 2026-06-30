import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Transpile workspace packages so Next's bundler treats them as
  // source (no separate build step needed for internal packages).
  transpilePackages: [
    '@shesa/config',
    '@shesa/domain',
    '@shesa/supabase',
    '@shesa/types',
    '@shesa/ui',
  ],
  // Strict mode catches more bugs at dev time; never disable.
  reactStrictMode: true,
  // Server Actions are how we wrap mutations (ADR-0030 + ADR-0033).
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Auth runs behind Caddy locally and Cloudflare in staging/prod;
  // both terminate TLS and forward X-Forwarded-Proto so Next correctly
  // detects HTTPS without an explicit https=true.
};

export default nextConfig;
