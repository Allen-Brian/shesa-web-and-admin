import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

/**
 * Vite config for apps/exco. See apps/finance/vite.config.ts for the
 * `define`-based process.env shim rationale.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '../..'), 'NEXT_PUBLIC_');

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 3002,
      strictPort: true,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      'process.env.NEXT_PUBLIC_APP_ENV': JSON.stringify(env.NEXT_PUBLIC_APP_ENV),
      'process.env.NEXT_PUBLIC_APP_BASE_DOMAIN': JSON.stringify(env.NEXT_PUBLIC_APP_BASE_DOMAIN),
      'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(env.NEXT_PUBLIC_SUPABASE_URL),
      'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(
        env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      ),
      'process.env.NEXT_PUBLIC_WEB_APP_URL': JSON.stringify(env.NEXT_PUBLIC_WEB_APP_URL),
      'process.env.NEXT_PUBLIC_AUTH_APP_URL': JSON.stringify(env.NEXT_PUBLIC_AUTH_APP_URL),
      'process.env.NEXT_PUBLIC_EXCO_APP_URL': JSON.stringify(env.NEXT_PUBLIC_EXCO_APP_URL),
      'process.env.NEXT_PUBLIC_FINANCE_APP_URL': JSON.stringify(env.NEXT_PUBLIC_FINANCE_APP_URL),
    },
  };
});
