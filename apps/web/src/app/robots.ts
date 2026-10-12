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
          // The Executive Committee's ballot. Its secrecy rests on the
          // token, not on this line — a disallow is a request, and the
          // route is also absent from the sitemap and unlinked from every
          // page. This stops it turning up in a search result, which is the
          // realistic way such a link escapes.
          '/awards/exco/',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
