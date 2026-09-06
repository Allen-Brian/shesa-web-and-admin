import type { MetadataRoute } from 'next';

import { clientEnv } from '@shesa/config/env.client';

/**
 * Crawl rules.
 *
 * Everything public is open. The exceptions are the pages that exist for
 * one person and carry a reference in the URL — a payment confirmation
 * or a ticket receipt. They are unguessable rather than secret, but they
 * are of no use in an index and should not be crawled.
 */
export default function robots(): MetadataRoute.Robots {
  const base = clientEnv.NEXT_PUBLIC_WEB_APP_URL.replace(/\/+$/, '');

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/receipt/',
          '/agm-2026/receipt/',
          '/agm-2026/confirmation/',
          '/agm-2026/pending/',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
