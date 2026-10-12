/**
 * Browser-side Supabase client for client components in the admin app.
 * Rare — most reads happen in Server Components, most writes go through
 * Server Actions. This is here for interactive flows that need a live
 * subscription or a client-side TanStack Query fetch.
 */

'use client';

import { createBrowserClient } from '@shesa/supabase/browser';

let cached: ReturnType<typeof createBrowserClient> | null = null;

export function getBrowserClient() {
  if (!cached) {
    cached = createBrowserClient();
  }
  return cached;
}
