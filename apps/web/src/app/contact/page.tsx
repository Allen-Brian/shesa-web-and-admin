import type { Metadata } from 'next';

import { ContactBody } from '@/components/contact/contact-body';
import { ContactHero } from '@/components/contact/contact-hero';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Reach the SHESA secretariat, general enquiries, membership, partnerships, media, and AGM 2026.',
  alternates: { canonical: '/contact' },
  openGraph: {
    title: 'Contact',
    description:
      'Reach the SHESA secretariat, general enquiries, membership, partnerships, media, and AGM 2026.',
    url: '/contact',
    type: 'website',
  },
};

export default function ContactPage() {
  return (
    <>
      <ContactHero />
      <ContactBody />
    </>
  );
}
