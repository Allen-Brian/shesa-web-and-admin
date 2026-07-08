import type { Metadata } from 'next';

import { AboutHero } from '@/components/about/about-hero';
import { Association } from '@/components/about/association';
import { Motto } from '@/components/about/motto';
import { Origin } from '@/components/about/origin';
import { Timeline } from '@/components/about/timeline';
import { Vision } from '@/components/about/vision';

export const metadata: Metadata = {
  title: 'About · SHESA',
  description:
    'The story of Sacred Heart College, Mankon and the alumni brotherhood — SHESA — that carries its ethos forward.',
};

export default function AboutPage() {
  return (
    <>
      <AboutHero />
      <Origin />
      <Motto />
      <Association />
      <Timeline />
      <Vision />
    </>
  );
}
