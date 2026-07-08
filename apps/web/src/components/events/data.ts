export type EventCategory =
  'Reunion' | 'Ceremony' | 'Community' | 'Cultural' | 'Fundraising' | 'Career';

export type ProgramItem = {
  readonly time: string;
  readonly title: string;
  readonly description?: string;
};

export type SiteEvent = {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly day: string;
  readonly month: string;
  readonly year: string;
  readonly fullDate: string;
  readonly location: string;
  readonly city: string;
  readonly image: string;
  readonly description: string;
  readonly category: EventCategory;
  readonly upcoming: boolean;
  readonly featured?: boolean;
  /** Slug of the gallery album that documents this event, if any. */
  readonly albumSlug?: string;
  /** Featured events only — flyer / poster images. */
  readonly flyers?: readonly string[];
  /** Featured events only — the day's programme, chronologically. */
  readonly program?: readonly ProgramItem[];
  /** Featured events only — additional paragraphs for a fuller narrative. */
  readonly extendedDescription?: readonly string[];
};

export const events: readonly SiteEvent[] = [
  {
    id: 'agm-2026',
    slug: 'agm-2026',
    title: 'AGM 2026 · The Yaoundé Assembly',
    day: '21',
    month: 'Nov',
    year: '2026',
    fullDate: '2026-11-21',
    location: 'Palais des Congrès',
    city: 'Yaoundé, Cameroon',
    image: '/hero_one.jpg',
    description:
      'The 2026 Annual General Meeting — an AGM like never before. Reunions, honours, the unveiling of Vision 2030, and the Cultural Night to close.',
    category: 'Reunion',
    upcoming: true,
    featured: true,
    flyers: ['/hero_two.jpg', '/hero_three.jpg', '/hero_four.jpg'],
    program: [
      {
        time: '08:00',
        title: 'Registration & Opening Prayers',
        description:
          'Delegates check in, collect programme booklets and lanyards. Opening prayer led by the Chaplain.',
      },
      {
        time: '09:00',
        title: 'Welcome Address',
        description: 'Dr. Etonge Ambe, National President, opens the assembly.',
      },
      {
        time: '10:00',
        title: 'Chapter Reports',
        description:
          'Branch and diaspora chairs present the state of their chapters for the year past.',
      },
      {
        time: '12:30',
        title: 'Lunch & Fellowship',
        description:
          'Two hours to eat, reconnect, and set up meetings for the afternoon breakouts.',
      },
      {
        time: '14:30',
        title: 'Vision 2030 · The Unveiling',
        description:
          'A working session to present, debate, and endorse the roadmap for the next four years.',
      },
      {
        time: '16:00',
        title: 'Awards Ceremony',
        description:
          "Honouring lifelong service, professional excellence, and this year's rising Shesans.",
      },
      {
        time: '18:00',
        title: 'Family Photograph & Recess',
        description:
          'Delegates step outside for the annual group photograph, then break to change for the evening.',
      },
      {
        time: '19:30',
        title: 'Cultural Night',
        description:
          'Formal dinner, live music, traditional dance troupes, and remarks from the honoured guests.',
      },
      {
        time: '23:00',
        title: 'After-Party',
        description: "The one you'll pretend you didn't attend — but everyone will.",
      },
    ],
    extendedDescription: [
      'The 2026 AGM is the most consequential SHESA assembly in a decade. Chapters have been asked to submit their delegation lists in advance so that seating, materials, and accommodation can be planned around real numbers rather than best guesses.',
      'The theme for this year is "Louder Than The Memory" — a call for the association to move from remembering what SHESA has been, to actively building what it can become. Every session of the day is designed against that theme.',
      'Registration is open to every dues-paid Shesan, plus one guest. Non-Shesan spouses, partners, and children are warmly welcomed to the Cultural Night in the evening. Formal attire is expected for the day sessions; national dress is encouraged for the evening.',
      'A rolling shuttle service will operate between the designated hotels and the venue. Details go out to confirmed attendees via the SG two weeks before the event.',
    ],
  },
  {
    id: 'health-outreach-bamenda-2026',
    slug: 'health-outreach-bamenda-2026',
    title: 'Health Outreach · Bamenda',
    day: '15',
    month: 'Dec',
    year: '2026',
    fullDate: '2026-12-15',
    location: 'Regional Hospital',
    city: 'Bamenda, Cameroon',
    image: '/hero_two.jpg',
    description:
      'Free consultations, screenings, and specialist referrals in Bamenda and outlying areas. Coordinated by the Welfare Portfolio.',
    category: 'Community',
    upcoming: true,
  },
  {
    id: 'homecoming-2027',
    slug: 'homecoming-2027',
    title: 'Homecoming Weekend',
    day: '10',
    month: 'Jan',
    year: '2027',
    fullDate: '2027-01-10',
    location: 'SHESA Campus',
    city: 'Buea, Cameroon',
    image: '/hero_three.jpg',
    description:
      'Two decades of memories, one long weekend on the campus that made us. Football, market showcase, candlelight vigil.',
    category: 'Reunion',
    upcoming: true,
  },
  {
    id: 'mentorship-fair-2027',
    slug: 'mentorship-fair-2027',
    title: 'Career Mentorship Fair',
    day: '20',
    month: 'Feb',
    year: '2027',
    fullDate: '2027-02-20',
    location: 'La Falaise Hotel',
    city: 'Douala, Cameroon',
    image: '/hero_four.jpg',
    description:
      'Curated encounters between graduating scholars and alumni mentors across industries. Register early — spots are limited.',
    category: 'Career',
    upcoming: true,
  },
  {
    id: 'scholarship-gala-2027',
    slug: 'scholarship-gala-2027',
    title: 'Scholarship Awards Gala',
    day: '15',
    month: 'Mar',
    year: '2027',
    fullDate: '2027-03-15',
    location: 'Hilton Hotel',
    city: 'Yaoundé, Cameroon',
    image: '/hero_five.jpg',
    description:
      'Honouring the recipients of the alumni scholarship programme, and the donors who make it possible.',
    category: 'Ceremony',
    upcoming: true,
  },
  {
    id: 'regional-summit-wa-2027',
    slug: 'regional-summit-wa-2027',
    title: 'Regional Summit · West Africa',
    day: '05',
    month: 'Apr',
    year: '2027',
    fullDate: '2027-04-05',
    location: 'Eko Convention Centre',
    city: 'Lagos, Nigeria',
    image: '/hero_one.jpg',
    description:
      'A cross-chapter gathering of the West African diaspora — SHESA, sister associations, and industry partners.',
    category: 'Reunion',
    upcoming: true,
  },
  {
    id: 'cultural-night-douala-2027',
    slug: 'cultural-night-douala-2027',
    title: 'Cultural Night · Douala',
    day: '22',
    month: 'May',
    year: '2027',
    fullDate: '2027-05-22',
    location: 'Palais des Sports',
    city: 'Douala, Cameroon',
    image: '/hero_two.jpg',
    description:
      'The Shesa spirit in full song — traditional dance, food, and stories from every era of the college.',
    category: 'Cultural',
    upcoming: true,
  },
  {
    id: 'endowment-fundraiser-2027',
    slug: 'endowment-fundraiser-2027',
    title: 'Endowment Fundraiser · Black Tie',
    day: '15',
    month: 'Jun',
    year: '2027',
    fullDate: '2027-06-15',
    location: 'Yaoundé Conference Centre',
    city: 'Yaoundé, Cameroon',
    image: '/hero_three.jpg',
    description:
      'A black-tie evening in support of the SHESA Endowment Fund. Dinner, auction, and remarks from the National President.',
    category: 'Fundraising',
    upcoming: true,
  },
  {
    id: 'business-forum-2027',
    slug: 'business-forum-2027',
    title: 'Alumni Business Forum',
    day: '12',
    month: 'Jul',
    year: '2027',
    fullDate: '2027-07-12',
    location: 'Sawa Hotel',
    city: 'Douala, Cameroon',
    image: '/hero_four.jpg',
    description:
      'A day-long forum for alumni entrepreneurs, investors, and executives. Panels, pitches, and after-hours networking.',
    category: 'Career',
    upcoming: true,
  },

  {
    id: 'agm-2024',
    slug: 'agm-2024',
    title: 'AGM 2024',
    day: '15',
    month: 'Nov',
    year: '2024',
    fullDate: '2024-11-15',
    location: 'Ayaba Hotel',
    city: 'Bamenda, Cameroon',
    image: '/hero_five.jpg',
    description: 'The biggest AGM in a decade — and a warm-up for what lies ahead in Yaoundé.',
    category: 'Reunion',
    upcoming: false,
    albumSlug: 'agm-2024',
  },
  {
    id: 'homecoming-2024',
    slug: 'homecoming-2024',
    title: 'Homecoming Weekend 2024',
    day: '12',
    month: 'Aug',
    year: '2024',
    fullDate: '2024-08-12',
    location: 'SHESA Campus',
    city: 'Buea, Cameroon',
    image: '/hero_one.jpg',
    description:
      'Twelve hundred alumni, forty-seven batches represented, eight diaspora chapters flying in.',
    category: 'Reunion',
    upcoming: false,
    albumSlug: 'homecoming-2024',
  },
  {
    id: 'scholarship-gala-2023',
    slug: 'scholarship-gala-2023',
    title: 'Scholarship Awards Gala 2023',
    day: '08',
    month: 'Dec',
    year: '2023',
    fullDate: '2023-12-08',
    location: 'Hilton Hotel',
    city: 'Yaoundé, Cameroon',
    image: '/hero_two.jpg',
    description: 'Fifty-six scholarships honoured. The next generation, seen and named.',
    category: 'Ceremony',
    upcoming: false,
    albumSlug: 'scholarship-gala-2023',
  },
  {
    id: 'international-summit-2023',
    slug: 'international-summit-2023',
    title: 'International Summit 2023',
    day: '20',
    month: 'May',
    year: '2023',
    fullDate: '2023-05-20',
    location: 'Kempinski Hotel',
    city: 'Douala, Cameroon',
    image: '/hero_three.jpg',
    description: 'A brotherhood without borders — chapters from three continents in a single hall.',
    category: 'Reunion',
    upcoming: false,
    albumSlug: 'international-summit-2023',
  },
  {
    id: 'health-outreach-2023',
    slug: 'health-outreach-2023',
    title: 'Health Outreach · Bamenda 2023',
    day: '04',
    month: 'Mar',
    year: '2023',
    fullDate: '2023-03-04',
    location: 'Regional Hospital',
    city: 'Bamenda, Cameroon',
    image: '/hero_four.jpg',
    description:
      'Two thousand two hundred consultations across three days. The template for the drives that followed.',
    category: 'Community',
    upcoming: false,
    albumSlug: 'health-outreach-2024',
  },
  {
    id: 'foundation-day-2023',
    slug: 'foundation-day-2023',
    title: 'Foundation Day 2023',
    day: '11',
    month: 'Feb',
    year: '2023',
    fullDate: '2023-02-11',
    location: 'Sacred Heart College',
    city: 'Mankon · Bamenda',
    image: '/hero_five.jpg',
    description:
      'Honouring the roots that hold us all — the annual Mass, the wreath at the tomb, and the alumni assembly on the hill.',
    category: 'Ceremony',
    upcoming: false,
    albumSlug: 'foundation-day-2023',
  },
];

export const upcomingEvents = events
  .filter((e) => e.upcoming)
  .sort((a, b) => a.fullDate.localeCompare(b.fullDate));

export const pastEvents = events
  .filter((e) => !e.upcoming)
  .sort((a, b) => b.fullDate.localeCompare(a.fullDate));

export const featuredEvent = events.find((e) => e.featured) ?? upcomingEvents[0];
