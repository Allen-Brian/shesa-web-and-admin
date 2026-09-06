import type { Metadata } from 'next';

import { AboutHero } from '@/components/about/about-hero';
import { Association } from '@/components/about/association';
import { Motto } from '@/components/about/motto';
import { Origin } from '@/components/about/origin';
import { StrategicPlanCta } from '@/components/about/strategic-plan-cta';
import { Timeline } from '@/components/about/timeline';
import { Vision } from '@/components/about/vision';

export const metadata: Metadata = {
  title: 'About',
  description:
    'The story of Sacred Heart College, Mankon and the alumni brotherhood, SHESA, that carries its ethos forward.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About',
    description:
      'The story of Sacred Heart College, Mankon and the alumni brotherhood, SHESA, that carries its ethos forward.',
    url: '/about',
    type: 'website',
  },
};

export default function AboutPage() {
  return (
    <>
      <AboutHero />
      <Motto />
      <Origin />
      <StrategicPlanCta />
      <Association />
      <Timeline />
      <Vision />
    </>
  );
}
