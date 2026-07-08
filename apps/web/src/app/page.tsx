/**
 * Public home page.
 *
 * Sections are composed here — each section lives in its own file under
 * `src/components/home/*` so this file stays a thin index.
 */

import { AgmCta } from '@/components/home/agm-cta';
import { Events } from '@/components/home/events';
import { Gallery } from '@/components/home/gallery';
import { Hero } from '@/components/home/hero';
import { Leadership } from '@/components/home/leadership';
import { Mission } from '@/components/home/mission';
import { MoreData } from '@/components/home/more-data';
import { PresidentsWord } from '@/components/home/presidents-word';
import { Projects } from '@/components/home/projects';
import { SoundsCta } from '@/components/home/sounds-cta';
import { Stats } from '@/components/home/stats';

export default function HomePage() {
  return (
    <>
      <Hero />
      <Mission />
      <Stats />
      <PresidentsWord />
      <AgmCta />
      <Events />
      <Projects />
      <Gallery />
      <Leadership />
      <MoreData />
      <SoundsCta />
    </>
  );
}
