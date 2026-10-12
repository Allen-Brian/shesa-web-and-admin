import { clientEnv } from '@shesa/config/env.client';

import { siteConfig } from '@/lib/site-config';

/**
 * JSON-LD for search engines.
 *
 * This is what turns a blue link into a rich result: an organisation
 * with a logo and social profiles, a site search box, an event with its
 * dates and venue. Google reads it; nothing on the page renders it.
 *
 * Emitted as a plain script tag rather than through `next/script`, which
 * is the shape Google's own documentation uses and which server-renders
 * into the HTML crawlers actually parse.
 */

function JsonLd({ data }: { readonly data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // The payload is built here from typed values, never from user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

const base = () => clientEnv.NEXT_PUBLIC_WEB_APP_URL.replace(/\/+$/, '');

/** The association itself. Belongs on the home page only. */
export function OrganizationSchema() {
  const url = base();

  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'SHESA',
        alternateName: 'Sacred Heart Ex-Students Association',
        url,
        logo: `${url}/shesa.png`,
        description: siteConfig.description,
        foundingLocation: {
          '@type': 'Place',
          name: 'Sacred Heart College Mankon, Bamenda, Cameroon',
        },
        areaServed: 'Worldwide',
        memberOf: {
          '@type': 'EducationalOrganization',
          name: 'Sacred Heart College Mankon',
          alternateName: 'SAHECO',
        },
      }}
    />
  );
}

/** Lets Google offer a search box for the site in results. */
export function WebSiteSchema() {
  const url = base();

  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: siteConfig.name,
        url,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${url}/news?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      }}
    />
  );
}

/**
 * One event, with the detail that produces a date-and-venue rich result.
 * `startDate` is a plain date; the CMS does not store a start time, and
 * inventing 09:00 would put a wrong time in front of people.
 */
export function EventSchema({
  name,
  description,
  startDate,
  location,
  city,
  image,
  slug,
  isPast,
}: {
  readonly name: string;
  readonly description: string;
  readonly startDate: string;
  readonly location: string;
  readonly city: string;
  readonly image: string;
  readonly slug: string;
  readonly isPast: boolean;
}) {
  const url = base();

  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Event',
        name,
        description,
        startDate,
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        url: `${url}/events/${slug}`,
        image: image.startsWith('http') ? image : `${url}${image}`,
        location: {
          '@type': 'Place',
          name: location || city,
          address: { '@type': 'PostalAddress', addressLocality: city },
        },
        organizer: { '@type': 'Organization', name: 'SHESA', url },
        ...(isPast ? {} : { offers: undefined }),
      }}
    />
  );
}

/** One news article. */
export function ArticleSchema({
  headline,
  description,
  image,
  publishedAt,
  authorName,
}: {
  readonly headline: string;
  readonly description: string;
  readonly image: string | null;
  readonly publishedAt: string;
  readonly authorName: string;
}) {
  const url = base();

  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline,
        description,
        datePublished: publishedAt,
        image: image ? [image.startsWith('http') ? image : `${url}${image}`] : undefined,
        author: { '@type': 'Person', name: authorName || 'SHESA' },
        publisher: {
          '@type': 'Organization',
          name: 'SHESA',
          logo: { '@type': 'ImageObject', url: `${url}/shesa.png` },
        },
      }}
    />
  );
}
