#!/usr/bin/env node
/**
 * dev:open — open every running Shesa local URL in the default browser.
 *
 * Usage:
 *   pnpm dev:open
 *
 * The script checks each URL for reachability first and opens only the
 * ones that respond. So:
 *
 *   - After `pnpm db:start` alone → opens Supabase Studio + Mailpit.
 *   - After `pnpm db:start && pnpm dev` → also opens each app dev server.
 *   - URLs that don't respond are SKIPPED with a friendly note (not an
 *     error) — running this before all services are up is fine.
 *
 * Cross-platform: uses `open` (macOS), `xdg-open` (Linux), `start` (Win).
 *
 * To add a new URL: append to the URLS array below. App URLs land in
 * E9 (auth) and E10 (web/exco/finance/connect) as those apps scaffold.
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(exec);

// ─────────────────────────────────────────────────────────────────────
// URLs to check + open. Ordered: dev-tools first (always available
// after `pnpm db:start`), then apps (only after `pnpm dev`).
// ─────────────────────────────────────────────────────────────────────
const URLS = [
  // — Supabase dev tools (boot with `pnpm db:start`) —
  { name: 'Supabase Studio (DB GUI)', url: 'http://127.0.0.1:54323' },
  { name: 'Mailpit (local email catcher)', url: 'http://127.0.0.1:54324' },
  { name: 'Supabase API (health probe)', url: 'http://127.0.0.1:54321', hide: true },

  // — Shesa apps (added per-epic as each app scaffolds) —
  // Uncomment the ones whose epic has landed. URLs match
  // `scripts/env-spec.mjs` local defaults — keep them in sync.
  //
  // E9 — auth app
  // { name: 'Shesa Auth', url: 'http://auth.shesa.test:3001' },
  //
  // E10 — web / exco / finance / connect
  // { name: 'Shesa Web (public site)', url: 'http://web.shesa.test:3000' },
  // { name: 'Shesa Exco', url: 'http://exco.shesa.test:3002' },
  // { name: 'Shesa Finance', url: 'http://finance.shesa.test:3003' },
  // { name: 'Shesa Connect', url: 'http://connect.shesa.test:3004' },
];

// ─────────────────────────────────────────────────────────────────────
// Reachability check — HEAD request with a short timeout. We use
// AbortController instead of a fetch-internal timeout because Node's
// built-in fetch doesn't honor `timeout` on its options object.
// ─────────────────────────────────────────────────────────────────────
async function isReachable(url, timeoutMs = 1500) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    // Any HTTP response (even 4xx) means the port is live. We don't care
    // about status — only that something is listening.
    await fetch(url, { method: 'HEAD', signal: ac.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

// ─────────────────────────────────────────────────────────────────────
// Platform-specific open command. Quoting the URL guards against any
// shell metacharacters that might sneak in (`?`, `&`, etc).
// ─────────────────────────────────────────────────────────────────────
function openCommand(url) {
  switch (process.platform) {
    case 'darwin':
      return `open '${url}'`;
    case 'win32':
      // `start` needs an empty title arg ("") when the first quoted arg
      // would otherwise be parsed as the window title.
      return `start "" "${url}"`;
    default:
      return `xdg-open '${url}'`;
  }
}

// ─────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Probing local Shesa services...\n');

  const results = await Promise.all(
    URLS.map(async (entry) => ({ ...entry, alive: await isReachable(entry.url) })),
  );

  const visible = results.filter((r) => !r.hide);
  for (const r of visible) {
    const status = r.alive ? '✓ up' : '· down';
    console.log(`  ${status.padEnd(8)} ${r.name.padEnd(36)} ${r.url}`);
  }
  console.log('');

  const toOpen = results.filter((r) => r.alive && !r.hide);
  if (toOpen.length === 0) {
    console.log('No local services reachable. Did you run `pnpm db:start`?');
    process.exit(0);
  }

  console.log(`Opening ${toOpen.length} URL(s)...`);
  await Promise.all(
    toOpen.map((entry) =>
      run(openCommand(entry.url)).catch((err) => {
        console.error(`  ✗ failed to open ${entry.url}: ${err.message}`);
      }),
    ),
  );
}

main().catch((err) => {
  console.error('dev:open failed:', err);
  process.exit(1);
});
