import type { Metadata } from 'next';

import { LegalDocument } from '@/components/legal/legal-document';
import { LegalPageHero } from '@/components/legal/legal-page-hero';

import { TERMS_META, TERMS_SECTIONS } from './terms-content';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'The rules that govern your use of the SHESA public website, the members-only Connect platform, and related services.',
  alternates: { canonical: '/terms' },
  openGraph: {
    title: 'Terms of Service',
    description:
      'The rules that govern your use of the SHESA public website, the members-only Connect platform, and related services.',
    url: '/terms',
    type: 'website',
  },
};

export default function TermsPage() {
  return (
    <>
      <LegalPageHero
        eyebrow={TERMS_META.eyebrow}
        title={TERMS_META.title}
        summary={TERMS_META.summary}
        effectiveDate={TERMS_META.effectiveDate}
        version={TERMS_META.version}
      />
      <LegalDocument
        sections={TERMS_SECTIONS}
        contactHref="/contact"
        contactEmail="hello@shesaconnect.com"
      />
    </>
  );
}
