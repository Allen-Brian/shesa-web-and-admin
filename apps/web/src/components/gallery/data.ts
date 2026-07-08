export type MediaItem = {
  readonly id: string;
  readonly type: 'photo' | 'video';
  /** Full-resolution source (image URL, or video URL). */
  readonly src: string;
  /** Optional smaller thumbnail — falls back to `src` when omitted. */
  readonly thumbnail?: string;
  /** Poster still for videos. */
  readonly poster?: string;
  readonly alt: string;
  /** Intrinsic aspect ratio, used for masonry/lightbox layout. */
  readonly aspect: '1/1' | '3/4' | '4/3' | '3/2' | '2/3';
};

export type Album = {
  readonly slug: string;
  readonly title: string;
  readonly date: string;
  readonly location: string;
  readonly description: string;
  readonly cover: string;
  readonly category: 'AGM' | 'Homecoming' | 'Ceremony' | 'Community' | 'Cultural' | 'Summit';
  readonly photographer?: string;
  readonly media: readonly MediaItem[];
};

// Placeholder demo video — a small, well-cached public MP4. Replace with
// self-hosted assets for production (self-hosted files make same-origin
// downloads work reliably and eliminate the CORS gotcha).
const SAMPLE_VIDEO =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

const heroPool = [
  '/hero_one.jpg',
  '/hero_two.jpg',
  '/hero_three.jpg',
  '/hero_four.jpg',
  '/hero_five.jpg',
  '/president_one.jpg',
  '/president_two.jpg',
] as const;

const aspects: MediaItem['aspect'][] = ['4/3', '3/4', '1/1', '3/2', '2/3'];

function buildMedia(slugPrefix: string, photos: number, videos: number): MediaItem[] {
  const out: MediaItem[] = [];
  for (let i = 0; i < photos; i++) {
    const src = heroPool[i % heroPool.length]!;
    out.push({
      id: `${slugPrefix}-p-${i + 1}`,
      type: 'photo',
      src,
      alt: `${slugPrefix} photo ${i + 1}`,
      aspect: aspects[i % aspects.length]!,
    });
  }
  for (let i = 0; i < videos; i++) {
    out.push({
      id: `${slugPrefix}-v-${i + 1}`,
      type: 'video',
      src: SAMPLE_VIDEO,
      poster: heroPool[(i + photos) % heroPool.length]!,
      alt: `${slugPrefix} video ${i + 1}`,
      aspect: '3/2',
    });
  }
  return out;
}

export const albums: readonly Album[] = [
  {
    slug: 'agm-2024',
    title: 'AGM 2024',
    date: 'November 2024',
    location: 'Ayaba Hotel · Bamenda',
    description:
      'The biggest AGM in a decade — and just the warm-up for what comes next in Yaoundé.',
    cover: '/hero_three.jpg',
    category: 'AGM',
    photographer: 'Ndifon Peter',
    media: buildMedia('agm-2024', 22, 2),
  },
  {
    slug: 'homecoming-2024',
    title: 'Homecoming Weekend 2024',
    date: 'August 2024',
    location: 'SHESA Campus · Buea',
    description: 'Two decades of memories, one long, unforgettable weekend on the hill.',
    cover: '/hero_one.jpg',
    category: 'Homecoming',
    photographer: 'The Media Team',
    media: buildMedia('homecoming-2024', 30, 3),
  },
  {
    slug: 'scholarship-gala-2023',
    title: 'Scholarship Gala 2023',
    date: 'December 2023',
    location: 'Hilton Hotel · Yaoundé',
    description: 'Honouring the next generation of Shesa scholars, and the donors behind them.',
    cover: '/hero_five.jpg',
    category: 'Ceremony',
    media: buildMedia('scholarship-gala-2023', 18, 1),
  },
  {
    slug: 'international-summit-2023',
    title: 'International Summit',
    date: 'May 2023',
    location: 'Kempinski · Douala',
    description: 'A brotherhood without borders — chapters from three continents in a single hall.',
    cover: '/hero_three.jpg',
    category: 'Summit',
    media: buildMedia('international-summit-2023', 24, 2),
  },
  {
    slug: 'youth-camp-2023',
    title: 'Youth Camp 2023',
    date: 'July 2023',
    location: 'Sacred Heart College · Mankon',
    description:
      'Where friendships begin and traditions get handed down. The next generation, forming.',
    cover: '/hero_four.jpg',
    category: 'Community',
    media: buildMedia('youth-camp-2023', 26, 3),
  },
  {
    slug: 'health-outreach-2024',
    title: 'Health Outreach · Bamenda',
    date: 'March 2024',
    location: 'Regional Hospital · Bamenda',
    description:
      'Two thousand consultations across three days. The template for the drives that followed.',
    cover: '/hero_two.jpg',
    category: 'Community',
    media: buildMedia('health-outreach-2024', 16, 1),
  },
  {
    slug: 'foundation-day-2023',
    title: 'Foundation Day 2023',
    date: 'February 2023',
    location: 'Sacred Heart College · Mankon',
    description:
      'The day we honour the roots that hold us all — Mass, wreath, and the alumni assembly.',
    cover: '/hero_two.jpg',
    category: 'Ceremony',
    media: buildMedia('foundation-day-2023', 20, 1),
  },
];

export const albumCategories = [
  'All',
  'AGM',
  'Homecoming',
  'Ceremony',
  'Community',
  'Cultural',
  'Summit',
] as const;

export type AlbumCategory = (typeof albumCategories)[number];

export function findAlbum(slug: string): Album | undefined {
  return albums.find((a) => a.slug === slug);
}
