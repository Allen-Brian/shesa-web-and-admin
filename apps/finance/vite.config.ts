import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

/**
 * Vite config for apps/finance.
 *
 * `define` makes `process.env.NEXT_PUBLIC_*` references resolve to literal
 * strings at build time so `@shesa/config/env.client` (written for Next.js,
 * which reads `process.env`) works unchanged from a Vite bundle. Without
 * this, the browser bundle would throw "process is not defined" the moment
 * it touched `clientEnv`.
 *
 * `host: '0.0.0.0'` so the Docker container is reachable from the host
 * browser. Native (non-Docker) dev still works at http://localhost:3003.
 */
export default defineConfig(({ mode }) => {
  // Load .env.local from the workspace root (two levels up from apps/finance)
  // matching the path the env-init script writes.
  const env = loadEnv(mode, path.resolve(__dirname, '../..'), 'NEXT_PUBLIC_');

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 3003,
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
