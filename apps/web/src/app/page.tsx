/**
 * Public home page.
 *
 * Sections are composed here, each section lives in its own file under
 * `src/components/home/*` so this file stays a thin index. DB-backed
 * strips (Events, News, Projects, Gallery, Leadership) are loaded server-
 * side and passed as props so an empty result renders a proper empty
 * state instead of hardcoded placeholders.
 */

import type { Metadata } from 'next';

import { AgmCta } from '@/components/home/agm-cta';
import { Events } from '@/components/home/events';
import { Gallery } from '@/components/home/gallery';
import { Hero } from '@/components/home/hero';
import { Leadership } from '@/components/home/leadership';
import { Mission } from '@/components/home/mission';
import { News } from '@/components/home/news';
import { PartnersStadium } from '@/components/home/partners-stadium';
import { PartnershipCta } from '@/components/home/partnership-cta';
import { PresidentsWord } from '@/components/home/presidents-word';
import { Projects } from '@/components/home/projects';
import { SoundsCta } from '@/components/home/sounds-cta';
import { Stats } from '@/components/home/stats';
import { StrategicPlanCta } from '@/components/home/strategic-plan-cta';
import { OrganizationSchema, WebSiteSchema } from '@/components/seo/structured-data';
import { siteConfig } from '@/lib/site-config';
import {
  loadHomeAlbums,
  loadHomeEvents,
  loadHomeLeaders,
  loadHomeNews,
  loadHomeProjects,
} from '@/lib/home-data';

export const metadata: Metadata = {
  title: `${siteConfig.name}, ${siteConfig.tagline}`,
  description: siteConfig.description,
  alternates: { canonical: '/' },
};

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [events, projects, albums, leaders, articles] = await Promise.all([
    loadHomeEvents(),
    loadHomeProjects(),
    loadHomeAlbums(),
    loadHomeLeaders(),
    loadHomeNews(),
  ]);
  return (
    <>
      <OrganizationSchema />
      <WebSiteSchema />
      <Hero />
      <Mission />
      <PresidentsWord />
      <AgmCta />
      <PartnershipCta />
      <Stats />
      <StrategicPlanCta />
      <Events events={events} />
      <Projects projects={projects} />
      <News articles={articles} />
      <Gallery albums={albums} />
      <Leadership leaders={leaders} />
      {/* "The Receipts" — the community-investment figures. Hidden until
          the numbers behind it are confirmed. */}
      {/* <MoreData /> */}
      {/* Partner boards always sit last, immediately above the footer. */}
      <PartnersStadium />
      <SoundsCta />
    </>
  );
}
