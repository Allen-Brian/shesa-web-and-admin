export type Article = {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly relativeDate: string;
  readonly date: string;
  readonly image: string;
  readonly author: {
    readonly name: string;
    readonly avatar: string;
  };
  readonly category: 'News' | 'Announcement';
  readonly tags: readonly string[];
  readonly excerpt: string;
  readonly body: readonly string[];
  readonly popular?: boolean;
};

export const articles: readonly Article[] = [
  {
    id: '01',
    slug: 'agm-2026-yaounde',
    title: 'AGM 2026: All roads lead to Palais des Congrès, Yaoundé',
    relativeDate: '2 days ago',
    date: 'March 12, 2026',
    image: '/hero_one.jpg',
    author: {
      name: 'The National Secretariat',
      avatar: '/president_one.jpg',
    },
    category: 'Announcement',
    tags: ['AGM', 'Reunion'],
    excerpt:
      'The 2026 Annual General Meeting is set for November 21 at Palais des Congrès, Yaoundé — an AGM like never before.',
    body: [
      'The National Executive is pleased to formally announce that the 2026 Annual General Meeting will take place on Saturday, November 21, 2026, at Palais des Congrès, Yaoundé. This is a moment we have been building toward for years — a convening that draws every corner of the SHESA family to a single hall.',
      'Registration opens August 1. Delegates from the branches, chapters, and diaspora are asked to file preliminary intentions with the Secretary General before June 30 so that logistics, accommodation, and the Cultural Night can be planned around the true numbers.',
      'This AGM will not simply revisit resolutions — it will unveil the Vision 2030 roadmap, honour lifelong service, and welcome the largest cohort of new life members in a decade. All roads, quite literally, lead to Yaoundé.',
    ],
    popular: true,
  },
  {
    id: '02',
    slug: 'scholarship-winners-2024',
    title: 'Scholarship winners announced for the 2024 academic year',
    relativeDate: '5 days ago',
    date: 'March 9, 2026',
    image: '/hero_two.jpg',
    author: {
      name: 'Programs Secretariat',
      avatar: '/president_two.jpg',
    },
    category: 'News',
    tags: ['Scholarships', 'Education'],
    excerpt:
      'Thirty-eight scholarships awarded to Shesan-aligned students this cycle — the largest cohort in the programme.',
    body: [
      'This year the Alumni Scholarship Programme awarded 38 full and partial scholarships — the largest cohort since the fund was constituted. Recipients were selected across all six graduating classes and represent every region in Cameroon.',
      'Notably, three recipients are the direct wards of Shesan alumni whose own studies had been supported by the fund a generation earlier. The programme now spans two full generations.',
      'A ceremony to honour recipients, donors, and the awarding committee will take place in Bamenda ahead of the AGM. Donors and mentors are being contacted individually with details.',
    ],
    popular: true,
  },
  {
    id: '03',
    slug: 'health-outreach-bamenda',
    title: 'Health outreach reaches 5,000 in Bamenda',
    relativeDate: '1 week ago',
    date: 'March 5, 2026',
    image: '/hero_three.jpg',
    author: {
      name: 'Welfare Portfolio',
      avatar: '/president_one.jpg',
    },
    category: 'News',
    tags: ['Health', 'Outreach', 'Community'],
    excerpt:
      'Free consultations, screenings, and referrals — the March health drive served over 5,000 residents across Mankon and its outlying areas.',
    body: [
      'Coordinated by the Welfare Portfolio in partnership with the Bamenda branch, the March 2026 health outreach served over 5,000 residents across Mankon and its outlying areas. The three-day drive included free consultations, blood pressure and diabetes screenings, and specialist referrals.',
      "Fifteen alumni — nine medical doctors and six nurses — volunteered their time. The Regional Hospital Bamenda hosted the closing clinic, and the Chief Medical Officer commended SHESA for what he described as 'the most organised alumni-led health drive we have seen'.",
      'The team will move next to Ndop in Q3, with a similar structure. Volunteers, especially specialists, are invited to sign up with the Welfare Secretary.',
    ],
  },
  {
    id: '04',
    slug: 'new-executive-sworn-in',
    title: 'New National Executive sworn in for 2026–2028',
    relativeDate: '2 weeks ago',
    date: 'February 26, 2026',
    image: '/hero_four.jpg',
    author: {
      name: 'The National Secretariat',
      avatar: '/president_two.jpg',
    },
    category: 'Announcement',
    tags: ['Executive', 'Governance'],
    excerpt:
      'Dr. Etonge Ambe formally sworn in as National President alongside a 17-member executive committee.',
    body: [
      'On February 22, at a ceremony held in Yaoundé, the incoming National Executive was formally sworn in for the 2026–2028 term. Dr. Etonge Ambe takes over as National President from Dr. Achu Samuel, who now serves as Immediate Past President.',
      'The full 17-member committee spans the Executive, Council Portfolios, Coordinators, and Advisory Council. Details are published on the Leadership page.',
      'The new executive has committed to a first-100-days plan focused on branch reactivation, scholarship pipeline strengthening, and preparations for the 2026 AGM.',
    ],
  },
  {
    id: '05',
    slug: 'homecoming-2024-recap',
    title: 'Homecoming weekend 2024: a recap in numbers',
    relativeDate: '3 weeks ago',
    date: 'February 19, 2026',
    image: '/hero_five.jpg',
    author: {
      name: 'Communications Secretariat',
      avatar: '/president_one.jpg',
    },
    category: 'News',
    tags: ['Homecoming', 'Reunion'],
    excerpt:
      'Two decades of memories, one long weekend — and 1,200 alumni back on the hill for it.',
    body: [
      '1,200 alumni. 47 batches represented. 8 diaspora chapters flying in. The 2024 Homecoming Weekend broke every prior attendance record and set a new benchmark for what the reunion can be.',
      "Highlights included the intergenerational football match (the class of 1998 finally lifting the trophy), the alumni market showcase, and the candlelight vigil at the founder's tomb.",
      'Plans for Homecoming 2027 are already underway — the theme, per the Programs Secretariat, will be "Roots and Wings".',
    ],
    popular: true,
  },
  {
    id: '06',
    slug: 'toronto-chapter-launched',
    title: 'Toronto chapter formally launched',
    relativeDate: '1 month ago',
    date: 'February 8, 2026',
    image: '/hero_one.jpg',
    author: {
      name: 'Diaspora Coordination',
      avatar: '/president_two.jpg',
    },
    category: 'Announcement',
    tags: ['Diaspora', 'Canada'],
    excerpt: 'The Canada chapter now has an active hub in Toronto, joining Ottawa and Montréal.',
    body: [
      'Coordinated by the interim Canada Chapter Executive, the Toronto hub was formally inaugurated at a ceremony on February 3 attended by 40 alumni currently resident in the Greater Toronto Area.',
      'Mr. Ndifon Blaise, who serves as the Canada Chapter President, presided over the swearing-in of the hub officers. The hub joins the existing Ottawa and Montréal groups under the Canada Chapter umbrella.',
      'Alumni across Ontario are encouraged to register their presence via the Diaspora Coordinator.',
    ],
  },
  {
    id: '07',
    slug: 'girls-school-renovation',
    title: "Community project: Girls' School renovation complete",
    relativeDate: '1 month ago',
    date: 'February 4, 2026',
    image: '/hero_two.jpg',
    author: {
      name: 'Programs Secretariat',
      avatar: '/president_one.jpg',
    },
    category: 'News',
    tags: ['Infrastructure', 'Community'],
    excerpt:
      'A joint SHESA-Community project restores two dilapidated classroom blocks and a small library.',
    body: [
      "The renovation of St. Bernadette Girls' School classroom blocks A and B is complete, along with the newly established Sister Mary Library — a joint project of SHESA, the school's parent-teacher association, and the local council.",
      'The project was funded by contributions from three diaspora chapters and matched by the Community Investment Fund. Total spend: 42 million XAF over 14 months.',
      'A handover ceremony took place on February 2. Photographs are being uploaded to the gallery this week.',
    ],
  },
  {
    id: '08',
    slug: 'global-summit-2027',
    title: 'Save the date: 2027 Global Alumni Summit',
    relativeDate: '5 weeks ago',
    date: 'January 30, 2026',
    image: '/hero_three.jpg',
    author: {
      name: 'The National Secretariat',
      avatar: '/president_two.jpg',
    },
    category: 'Announcement',
    tags: ['Summit', 'Global'],
    excerpt: 'The next Global Summit is confirmed for October 2027 in Lagos, Nigeria.',
    body: [
      'Following the successful 2023 summit, the National Executive has confirmed that the 2027 Global Alumni Summit will convene in Lagos, Nigeria, from October 8–10, 2027, at the Eko Convention Centre.',
      'The summit is a biennial gathering distinct from the AGM, focused on cross-chapter learning, thematic sessions, and Africa-wide policy conversations.',
      'A steering committee is being constituted. Chapter presidents will receive detailed correspondence in due course.',
    ],
  },
  {
    id: '09',
    slug: 'legal-adviser-appointed',
    title: 'Legal Adviser appointed to the National Committee',
    relativeDate: '6 weeks ago',
    date: 'January 22, 2026',
    image: '/hero_four.jpg',
    author: {
      name: 'The National Secretariat',
      avatar: '/president_one.jpg',
    },
    category: 'Announcement',
    tags: ['Executive', 'Governance'],
    excerpt: 'Barr. Ndifon George formally joins the Advisory Council as Legal Adviser.',
    body: [
      'The National Executive is pleased to announce the appointment of Barr. Ndifon George as Legal Adviser to the National Committee, filling the vacancy left following the retirement of Barr. Emeritus Achu Vincent.',
      'Barr. Ndifon brings over two decades of practice at the Cameroon Bar and has served the association informally for many years.',
      'He assumes his role with immediate effect.',
    ],
  },
];
