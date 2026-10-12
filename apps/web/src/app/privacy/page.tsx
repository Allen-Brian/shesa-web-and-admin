import type { Metadata } from 'next';

import { LegalDocument } from '@/components/legal/legal-document';
import { LegalPageHero } from '@/components/legal/legal-page-hero';

import { PRIVACY_META, PRIVACY_SECTIONS } from './privacy-content';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How the Sacred Heart Ex-Students’ Association collects, uses, and protects your personal data across the public website, the Connect platform, and payment flows.',
  alternates: { canonical: '/privacy' },
  openGraph: {
    title: 'Privacy Policy',
    description:
      'How the Sacred Heart Ex-Students\u2019 Association collects, uses, and protects your personal data across the public website, the Connect platform, and payment flows.',
    url: '/privacy',
    type: 'website',
  },
};

export default function PrivacyPage() {
  return (
    <>
      <LegalPageHero
        eyebrow={PRIVACY_META.eyebrow}
        title={PRIVACY_META.title}
        summary={PRIVACY_META.summary}
        effectiveDate={PRIVACY_META.effectiveDate}
        version={PRIVACY_META.version}
      />
      <LegalDocument
        sections={PRIVACY_SECTIONS}
        contactHref="/contact"
        contactEmail="hello@shesaconnect.com"
      />
    </>
  );
}
