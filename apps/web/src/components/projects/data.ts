export type ProjectCategory =
  'Education' | 'Health' | 'Infrastructure' | 'Community' | 'Finance' | 'Career' | 'Culture';

export type ProjectStatus = 'Active' | 'Ongoing' | 'Planning' | 'Fundraising' | 'Completed';

export type ProjectMilestone = {
  readonly date: string;
  readonly title: string;
  readonly body?: string;
  readonly done?: boolean;
};

export type ProjectImpact = {
  readonly value: string;
  readonly label: string;
};

export type Project = {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly category: ProjectCategory;
  readonly status: ProjectStatus;
  readonly shortDescription: string;
  readonly description: readonly string[];
  readonly image: string;
  readonly gallery?: readonly string[];
  readonly startedOn: string;
  readonly location: string;
  readonly lead: string;
  readonly featured?: boolean;
  /** Fundraising: raised + target, both in the same currency. */
  readonly funding?: {
    readonly raised: number;
    readonly target: number;
    readonly currency: string;
  };
  readonly impact?: readonly ProjectImpact[];
  readonly milestones?: readonly ProjectMilestone[];
};

export const projects: readonly Project[] = [
  {
    id: 'endowment-fund',
    slug: 'endowment-fund',
    title: 'SHESA Endowment Fund',
    category: 'Finance',
    status: 'Fundraising',
    shortDescription: 'Building a permanent capital base to fund SHESA missions in perpetuity.',
    description: [
      "The Endowment Fund is the association's long-horizon answer to short-term fundraising fatigue. Instead of raising money project-by-project, we build a permanent capital base and fund every future initiative from the income it generates.",
      'The target is XAF 500 million by the end of 2028. Every gift, however small, is invested in a diversified low-volatility portfolio managed by an independent trustee committee.',
      "Contributors receive an annual statement of the fund's performance, along with a breakdown of the missions it funded that year. Full transparency is not negotiable.",
    ],
    image: '/hero_two.jpg',
    startedOn: 'January 2024',
    location: 'National',
    lead: 'Mrs. Tanyi Bih, Treasurer',
    featured: true,
    funding: { raised: 178_000_000, target: 500_000_000, currency: 'XAF' },
    impact: [
      { value: '35%', label: 'To goal' },
      { value: '820+', label: 'Contributors' },
      { value: '12', label: 'Diaspora chapters giving' },
    ],
    milestones: [
      {
        date: 'Jan 2024',
        title: 'Fund constituted',
        body: 'Trust deed signed. Independent trustees appointed.',
        done: true,
      },
      {
        date: 'Jun 2024',
        title: 'First XAF 100M crossed',
        body: 'Milestone marked with a donor recognition dinner in Yaoundé.',
        done: true,
      },
      {
        date: 'Nov 2024',
        title: 'Diaspora giving activated',
        body: 'Online giving channel launched for USA, Canada, UK, and EU donors.',
        done: true,
      },
      {
        date: 'Nov 2026',
        title: 'XAF 300M target',
        body: 'The AGM-year milestone. Announcement scheduled for the Yaoundé assembly.',
      },
      {
        date: 'Dec 2028',
        title: 'Full XAF 500M target',
        body: 'The endowment fund is self-sustaining and closed to further fundraising.',
      },
    ],
  },
  {
    id: 'scholarship-programme',
    slug: 'scholarship-programme',
    title: 'Alumni Scholarship Programme',
    category: 'Education',
    status: 'Active',
    shortDescription:
      'Sending the brightest students to school on the shoulders of alumni who came before.',
    description: [
      'The scholarship programme underwrites tuition, boarding, and books for high-performing SHESA-aligned students whose families cannot fully bear the cost. Awards range from partial to full, depending on need.',
      'Selection is handled by the Programs Committee against strict academic and character criteria. The programme is fully anonymised — donors do not choose recipients, and recipients do not know their donors unless both parties opt in.',
      'Since its formal launch in 2016, the programme has grown from 8 awards a year to 38 in 2024 — the largest cohort to date.',
    ],
    image: '/hero_three.jpg',
    startedOn: 'September 2016',
    location: 'National + diaspora',
    lead: 'Dr. Chi Emmanuel, Programs Secretary',
    impact: [
      { value: '1,850+', label: 'Scholarships awarded' },
      { value: '38', label: '2024 cohort' },
      { value: '92%', label: 'University matriculation rate' },
    ],
    milestones: [
      {
        date: 'Sep 2016',
        title: 'Programme launched',
        body: 'First 8 awards issued for the 2016–2017 academic year.',
        done: true,
      },
      {
        date: 'Dec 2020',
        title: '500 awards crossed',
        body: 'Marked at the AGM in Bamenda.',
        done: true,
      },
      {
        date: 'Dec 2023',
        title: '1,500 awards',
        body: 'The programme reaches full generational reach.',
        done: true,
      },
      {
        date: 'Sep 2027',
        title: 'Expand to 60 awards / year',
        body: 'Linked to endowment fund performance.',
      },
    ],
  },
  {
    id: 'infrastructure-renewal',
    slug: 'infrastructure-renewal',
    title: 'School Infrastructure Renewal',
    category: 'Infrastructure',
    status: 'Ongoing',
    shortDescription:
      'Restoring the halls, labs, and libraries that shaped generations of SHESA scholars.',
    description: [
      "A rolling programme to restore, repair, and modernise the physical fabric of Sacred Heart College — with the school's Board and the parent-teacher association as full partners.",
      'The pipeline includes classroom blocks, the science laboratories, the library, staff quarters, and the sports pitches. Each intervention is scoped, quoted, and audited independently.',
      'The most recent completed project was the restoration of the West Wing classroom block — funded by two diaspora chapters and matched by the endowment income for the year.',
    ],
    image: '/hero_four.jpg',
    startedOn: 'March 2019',
    location: 'Sacred Heart College, Mankon',
    lead: 'Eng. Foncha Blaise, Bafoussam Branch',
    impact: [
      { value: '4', label: 'Blocks restored' },
      { value: 'XAF 220M', label: 'Deployed' },
      { value: '3,400+', label: 'Students impacted' },
    ],
    milestones: [
      { date: '2019', title: 'West Dorm restoration', done: true },
      { date: '2021', title: 'Chapel repairs', done: true },
      { date: '2023', title: 'Science labs upgrade', done: true },
      { date: '2024', title: 'West Wing classroom block', done: true },
      { date: '2026', title: 'Library modernisation', body: 'Fundraising in progress.' },
      { date: '2028', title: 'Sports facilities' },
    ],
  },
  {
    id: 'health-outreach',
    slug: 'health-outreach',
    title: 'Community Health Outreach',
    category: 'Health',
    status: 'Active',
    shortDescription:
      'Free consultations, screenings, and specialist care in underserved communities.',
    description: [
      'A rolling programme of medical outreach drives coordinated by the Welfare Portfolio in partnership with alumni doctors, nurses, and pharmacists.',
      'Each drive lasts three to five days and includes general consultations, chronic-disease screenings (hypertension, diabetes, glaucoma), and specialist referrals for cases beyond primary-care scope.',
      'Since 2021 the programme has served over 12,000 residents across six regions. Bamenda alone has been visited three times.',
    ],
    image: '/hero_five.jpg',
    startedOn: 'March 2021',
    location: 'Rotating (Bamenda, Buea, Kumba, Ndop)',
    lead: 'Mrs. Nkeng Josephine, Welfare Secretary',
    impact: [
      { value: '12,300+', label: 'Consultations delivered' },
      { value: '15', label: 'Alumni volunteers per drive' },
      { value: '6', label: 'Regions reached' },
    ],
    milestones: [
      {
        date: 'Mar 2021',
        title: 'First drive · Bamenda',
        body: 'The template for everything that followed.',
        done: true,
      },
      {
        date: '2022–2024',
        title: 'Regional expansion',
        body: 'Buea, Kumba, Ndop added to the rotation.',
        done: true,
      },
      { date: 'Dec 2026', title: 'Bamenda return', body: 'The Q4 drive.' },
      { date: '2027', title: 'Specialist wing pilot', body: 'Adding vision and dental care.' },
    ],
  },
  {
    id: 'digital-library',
    slug: 'digital-library',
    title: 'Digital Library Initiative',
    category: 'Education',
    status: 'Planning',
    shortDescription:
      'A global digital archive of SHESA academic resources — open to students everywhere.',
    description: [
      'A long-planned initiative to digitise every academic resource ever printed by or for SHESA students — from past exam papers to lecture notes, from staff-produced handbooks to the college magazine archive.',
      'Full-text search, subject filters, and download. Access is free for SHESA students and alumni; a modest subscription supports upkeep and scanning for non-alumni users.',
      'Design and scope work is complete. The build phase is fundraising-dependent.',
    ],
    image: '/hero_one.jpg',
    startedOn: 'Planning · Q3 2025',
    location: 'Cloud-hosted',
    lead: 'Mr. Fru Wilson, Communications Secretary',
    impact: [
      { value: '~40k', label: 'Documents identified' },
      { value: '6', label: 'Decades of coverage' },
    ],
    milestones: [
      { date: 'Q3 2025', title: 'Design + scope', done: true },
      { date: 'Q4 2025', title: 'Fundraising launched' },
      { date: 'Q2 2026', title: 'Digitisation begins' },
      { date: 'Q4 2026', title: 'Public beta' },
      { date: 'Q1 2027', title: 'Full launch' },
    ],
  },
  {
    id: 'mentorship-platform',
    slug: 'mentorship-platform',
    title: 'Career Mentorship Platform',
    category: 'Career',
    status: 'Ongoing',
    shortDescription:
      'Connecting graduating scholars with alumni mentors across industries and continents.',
    description: [
      'A structured mentorship pairing between graduating scholars and mid- to senior-career alumni. Each pairing runs for 12 months and includes a monthly check-in, one professional introduction, and access to the alumni knowledge base.',
      "Pairings are made by the Programs Committee based on the mentee's stated interests, the mentor's expertise, and geography where relevant.",
      'The platform launched in beta in 2023 and has since seen 320 successful pairings.',
    ],
    image: '/hero_two.jpg',
    startedOn: 'August 2023',
    location: 'National + diaspora',
    lead: 'Mr. Tanyi Peter, Youth Coordinator',
    impact: [
      { value: '320+', label: 'Mentorship pairings' },
      { value: '87%', label: 'Programme completion rate' },
      { value: '45+', label: 'Industries represented' },
    ],
    milestones: [
      { date: 'Aug 2023', title: 'Beta launch', done: true },
      { date: 'Jun 2024', title: '200 pairings', done: true },
      { date: 'Feb 2025', title: 'Full platform launch' },
      { date: 'Q4 2026', title: '500 pairings target' },
    ],
  },
  {
    id: 'girls-school-renovation',
    slug: 'girls-school-renovation',
    title: "Girls' School Renovation",
    category: 'Infrastructure',
    status: 'Completed',
    shortDescription:
      'A joint SHESA-Community project — two classroom blocks and a small library, restored end to end.',
    description: [
      "Rehabilitation of two classroom blocks and the establishment of the Sister Mary Library at St. Bernadette Girls' School — a joint project of SHESA, the school's parent-teacher association, and the local council.",
      'The project was funded by contributions from three diaspora chapters and matched by the Community Investment Fund. Total spend: XAF 42 million over 14 months.',
      'A formal handover ceremony took place in February 2026. The library has since become the primary study space for over 300 students.',
    ],
    image: '/hero_three.jpg',
    startedOn: 'December 2024',
    location: "St. Bernadette Girls' School",
    lead: 'Diaspora Coordination',
    impact: [
      { value: '2', label: 'Classroom blocks' },
      { value: '1', label: 'Library established' },
      { value: '300+', label: 'Students now served' },
    ],
    milestones: [
      { date: 'Dec 2024', title: 'Project scoped + funded', done: true },
      { date: 'Sep 2025', title: 'Construction complete', done: true },
      { date: 'Feb 2026', title: 'Handover ceremony', done: true },
    ],
  },
  {
    id: 'business-incubator',
    slug: 'business-incubator',
    title: 'Alumni Business Incubator',
    category: 'Career',
    status: 'Planning',
    shortDescription: 'A structured incubator for early-stage founders in the SHESA network.',
    description: [
      'A structured incubator for early-stage founders — pre-seed to seed — who are alumni of the college. The programme includes 12 weeks of workshops, weekly office hours with experienced founders, and access to a pool of angel checks contributed by senior alumni.',
      'Each cohort will accept 8 founders. The first cohort is planned to launch in early 2027.',
    ],
    image: '/hero_four.jpg',
    startedOn: 'Design · Q1 2026',
    location: 'Douala (in person)',
    lead: 'Alumni Business Forum',
    impact: [{ value: '8', label: 'Founders per cohort (planned)' }],
    milestones: [
      { date: 'Q1 2026', title: 'Curriculum + partner network', done: true },
      { date: 'Q3 2026', title: 'Angel pool constituted' },
      { date: 'Q1 2027', title: 'Cohort 1 launches' },
    ],
  },
  {
    id: 'cultural-preservation',
    slug: 'cultural-preservation',
    title: 'Cultural Preservation Fund',
    category: 'Culture',
    status: 'Fundraising',
    shortDescription: 'Preserving the songs, traditions, and folklore of the SHESA experience.',
    description: [
      'A dedicated fund to record, archive, and reissue the songs, chants, and traditions that make up the SHESA cultural inheritance — from the anthems that still ring in every reunion to the parade chants only certain classes remember.',
      'The fund also supports the annual Cultural Night at each AGM, and underwrites the traditional dance troupes and choral groups that appear at official events.',
    ],
    image: '/hero_five.jpg',
    startedOn: 'October 2025',
    location: 'National',
    lead: 'Mr. Achu Jean, Publicity Secretary',
    funding: { raised: 12_500_000, target: 60_000_000, currency: 'XAF' },
    impact: [
      { value: '18', label: 'Songs archived so far' },
      { value: '4', label: 'Traditions documented' },
    ],
    milestones: [
      { date: 'Oct 2025', title: 'Fund constituted', done: true },
      { date: '2026', title: 'First 25 songs recorded + released' },
      { date: '2027', title: 'Public archive launched' },
    ],
  },
  {
    id: 'emergency-relief',
    slug: 'emergency-relief',
    title: 'Emergency Relief Fund',
    category: 'Community',
    status: 'Active',
    shortDescription:
      'Rapid financial and material support for alumni and their families in crisis.',
    description: [
      'A standing fund that can be deployed within 48 hours for confirmed cases of medical emergency, natural disaster, or acute loss affecting Shesans and their immediate family.',
      'Requests are triaged by a small standing committee. Disbursements are capped per case and recorded transparently in the annual welfare report.',
      'Since its constitution in 2022 the fund has responded to 47 confirmed cases.',
    ],
    image: '/hero_one.jpg',
    startedOn: 'April 2022',
    location: 'National + diaspora',
    lead: 'Welfare Portfolio',
    impact: [
      { value: '47', label: 'Cases supported' },
      { value: '48 hrs', label: 'Median response' },
    ],
    milestones: [
      { date: 'Apr 2022', title: 'Fund constituted', done: true },
      { date: 'Dec 2024', title: '25th disbursement', done: true },
      { date: 'Nov 2025', title: '47th disbursement', done: true },
    ],
  },
];

export const projectCategories = [
  'All',
  'Education',
  'Health',
  'Infrastructure',
  'Community',
  'Finance',
  'Career',
  'Culture',
] as const;

export type ProjectCategoryFilter = (typeof projectCategories)[number];

export function findProject(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}
