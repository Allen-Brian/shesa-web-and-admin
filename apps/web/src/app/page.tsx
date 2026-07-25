/**
 * Public home page.
 *
 * Sections are composed here, each section lives in its own file under
 * `src/components/home/*` so this file stays a thin index. DB-backed
 * strips (Events, Projects, Gallery, Leadership) are loaded server-
 * side and passed as props so an empty result renders a proper empty
 * state instead of hardcoded placeholders.
 */

import { AgmCta } from '@/components/home/agm-cta';
import { Events } from '@/components/home/events';
import { Gallery } from '@/components/home/gallery';
import { Hero } from '@/components/home/hero';
import { Leadership } from '@/components/home/leadership';
import { Mission } from '@/components/home/mission';
import { MoreData } from '@/components/home/more-data';
import { PartnershipCta } from '@/components/home/partnership-cta';
import { PresidentsWord } from '@/components/home/presidents-word';
import { Projects } from '@/components/home/projects';
import { SoundsCta } from '@/components/home/sounds-cta';
import { Stats } from '@/components/home/stats';
import { StrategicPlanCta } from '@/components/home/strategic-plan-cta';
import { loadHomeAlbums, loadHomeEvents, loadHomeLeaders, loadHomeProjects } from '@/lib/home-data';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [events, projects, albums, leaders] = await Promise.all([
    loadHomeEvents(),
    loadHomeProjects(),
    loadHomeAlbums(),
    loadHomeLeaders(),
  ]);
  return (
    <>
      <Hero />
      <Mission />
      <Stats />
      <PresidentsWord />
      <StrategicPlanCta />
      <AgmCta />
      <PartnershipCta />
      <Events events={events} />
      <Projects projects={projects} />
      <Gallery albums={albums} />
      <Leadership leaders={leaders} />
      <MoreData />
      <SoundsCta />
    </>
  );
}
