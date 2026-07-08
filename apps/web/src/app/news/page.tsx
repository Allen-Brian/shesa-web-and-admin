import type { Metadata } from 'next';

import { NewsHero } from '@/components/news/news-hero';
import { NewsReader } from '@/components/news/news-reader';

export const metadata: Metadata = {
  title: 'News & Announcements · SHESA',
  description: 'The official record of SHESA news, announcements, and community dispatches.',
};

export default function NewsPage() {
  return (
    <>
      <NewsHero />
      <NewsReader />
    </>
  );
}
