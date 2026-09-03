/**
 * Static content for the SHESA Strategic Plan 2026–2030 landing page.
 * Kept in-repo (not in the CMS) because the document is a fixed
 * publication, it either matches the printed brochure or it doesn't,
 * so version-control gives the closest analogue to a signed source
 * of truth.
 */

export const STRATEGIC_PLAN_META = {
  period: '2026 – 2030',
  edition: 'First Edition',
  headline: 'A structured, modern, globally connected SHESA.',
  subhead:
    'Our five-year pathway to institutional unity, member value, financial resilience, and societal impact.',
  intro:
    'This Strategic Plan articulates SHESA’s transformation from a legacy alumni association into a resilient, professionally driven, and institutionally unified global network, anchored on strengthened governance, digital engagement, sustainable finance, and outward partnerships.',
} as const;

export interface Bullet {
  readonly title: string;
  readonly body?: string;
}

export const EXECUTIVE_SUMMARY = {
  paragraphs: [
    'This Strategic Plan provides a high-level overview of SHESA’s strategic direction, key priorities, and expected outcomes for the 2026–2030 period, marking a decisive transition toward a more structured, modern, and globally connected alumni institution.',
    'Over the five-year period, SHESA will pursue a deliberate strategic shift centred on strengthening governance coherence, enhancing member engagement through digital and professional platforms, and establishing a sustainable financial model to support long-term growth and impact.',
    'The strategy is anchored on four key priorities: advancing governance excellence and institutional unity, elevating member engagement and professional connectivity, strengthening financial sustainability and institutional credibility, and fostering strategic partnerships for broader societal impact.',
  ],
  outcomes: [
    'A harmonised global governance framework with strong institutional cohesion.',
    'A vibrant and digitally enabled professional alumni ecosystem.',
    'Financial resilience through diversified and predictable revenue streams.',
    'A credible partner contributing meaningfully to education, youth development, and national progress.',
  ],
} as const;

export const BACKGROUND_MANDATE = {
  background: [
    'The Sacred Heart Ex-Students’ Association (SHESA) is the official alumni body of Sacred Heart College Mankon (SAHECO). SHESA is a duly registered association operating in accordance with the 1990 Law on Freedom of Association.',
    'Its core mandate is to foster a strong sense of fraternity among alumni by providing a platform that connects, empowers, and harnesses the professional expertise of SHESANs worldwide, for the mutual benefit of its members and the continued development of SAHECO.',
    'With over five decades of existence, SHESA is governed by an Executive Committee led by the President General, comprising 11 branches across at least seven regions of Cameroon, and international branches in Germany, the United States, the United Kingdom, and Canada.',
  ],
  strategicContext: [
    'SHESA operates within an increasingly complex institutional landscape that necessitates deliberate strategic alignment, adaptive governance, and renewed organizational discipline.',
    'At the governance level, variations in interpretation and growing assertions of operational autonomy, particularly within some country branches, have introduced misalignments in decision-making authority, accountability, and institutional coherence.',
    'In parallel, SHESA must reposition itself as a modern, value-driven alumni ecosystem. Its current engagement architecture remains constrained by limited digital enablement and the absence of structured professional programming.',
  ],
  rationale: [
    'The 2026–2030 strategic period represents a pivotal inflection point in SHESA’s institutional evolution. Having built a strong legacy over five decades, the Association now faces a convergence of governance, engagement, and sustainability challenges that require deliberate and coordinated transformation.',
    'This period is critical for three main reasons: SHESA’s multi-branch and international structure demands a shift from loosely coordinated operations to a more coherent, federated model; member expectations are evolving rapidly toward structured professional value and digital connectivity; and the Association’s financial model must diversify to sustain long-term growth.',
  ],
  institutionalShifts: [
    'Transitioning to a harmonised, internationally aligned governance framework that balances branch autonomy with central coordination.',
    'Building a digitally enabled alumni ecosystem that facilitates networking, mentorship, and knowledge exchange.',
    'Integrating batch and generational structures into a unified engagement model that strengthens institutional cohesion.',
    'Establishing sustainable financial systems supported by transparency, compliance, and diversified revenue streams.',
  ],
} as const;

export const FRAMEWORK = {
  vision:
    'To be a globally connected, professionally empowered, and institutionally unified alumni network that serves as a model for excellence, leadership, and impact, while contributing meaningfully to the advancement of Sacred Heart College Mankon and society at large.',
  mission:
    'SHESA exists to connect and mobilise its global alumni community by fostering lifelong relationships, promoting professional and personal development, and harnessing the collective expertise and resources of SHESANs to support one another and contribute to the sustained growth and excellence of Sacred Heart College Mankon.',
  values: [
    {
      title: 'Unity and Fraternity',
      body: 'We uphold a strong sense of brotherhood that transcends generations, geographies, and affiliations, fostering inclusiveness and mutual respect across all branches.',
    },
    {
      title: 'Integrity and Accountability',
      body: 'We are committed to transparency, ethical leadership, and responsible stewardship of resources, ensuring that all actions align with the Association’s constitution and collective interests.',
    },
    {
      title: 'Service and Commitment',
      body: 'We prioritise active contribution and shared responsibility, encouraging every member to play a meaningful role in advancing SHESA’s mission and supporting SAHECO.',
    },
    {
      title: 'Excellence and Professionalism',
      body: 'We strive for high standards in governance, programming, and engagement, leveraging the professional expertise within our network to deliver value-driven initiatives.',
    },
    {
      title: 'Innovation and Adaptability',
      body: 'We embrace change by adopting modern technologies and progressive approaches that enhance connectivity, relevance, and organizational effectiveness.',
    },
    {
      title: 'Inclusivity and Intergenerational Engagement',
      body: 'We recognise and integrate the diverse perspectives of all alumni, ensuring that both legacy members and emerging cohorts are meaningfully engaged within a unified institutional framework.',
    },
  ] satisfies readonly Bullet[],
  pillars: [
    {
      title: 'Advancing Institutional Unity through Governance Excellence',
      body: 'Strengthening SHESA’s structural integrity by establishing a harmonised, federated governance model across all branches, with clarity of roles and consistent decision-making frameworks that reinforce unity while respecting subsidiarity.',
    },
    {
      title: 'Elevating Member Engagement and Professional Connectivity',
      body: 'Repositioning SHESA as a modern, value-driven alumni ecosystem, with a digitally enabled platform that facilitates global connectivity, structured professional networking, mentorship, and knowledge exchange.',
    },
    {
      title: 'Strengthening Financial Resilience and Institutional Capacity',
      body: 'Building a predictable and diversified financial model, strengthening financial governance, and improving systems, processes, and leadership effectiveness required to deliver strategic priorities.',
    },
    {
      title: 'Fostering Strategic Partnerships and Societal Impact',
      body: 'Positioning SHESA as an outward-facing institution contributing to national development, through structured partnerships with government, development agencies, private sector, and international institutions.',
    },
  ] satisfies readonly Bullet[],
} as const;

export interface StrategicGoal {
  readonly index: 1 | 2 | 3 | 4;
  readonly title: string;
  readonly subtitle: string;
  readonly purpose: string;
  readonly priorityAreas: readonly Bullet[];
  readonly outcome: string;
}

export const GOALS: readonly StrategicGoal[] = [
  {
    index: 1,
    title: 'Governance & Institutional Unity',
    subtitle: 'A cohesive, well-governed global alumni community.',
    purpose:
      'To build a cohesive, well-governed, and inclusive global alumni community anchored in a robust constitutional framework.',
    priorityAreas: [
      {
        title: 'Global Constitutional Framework',
        body: 'Development and adoption of a binding constitution to ensure institutional unity and legal coherence across SHESA.',
      },
      {
        title: 'Integrated Governance Architecture',
        body: 'Establishment of clear roles, responsibilities, and reporting lines across global, regional, and chapter levels.',
      },
      {
        title: 'Institutional Cohesion and Inclusiveness',
        body: 'Strengthening unity through integration of batch structures and promotion of cross-generational collaboration.',
      },
      {
        title: 'Member Participation and Engagement Systems',
        body: 'Enhancement of structured engagement mechanisms to increase active participation and volunteerism.',
      },
      {
        title: 'Member Welfare and Support Systems',
        body: 'Development of sustainable welfare initiatives, including health and life insurance schemes.',
      },
      {
        title: 'Institutional Support to SAHECO',
        body: 'Structured alumni interventions to strengthen SAHECO as a talent development hub.',
      },
    ],
    outcome:
      'A unified and effectively governed global alumni system with harmonised structures, strong institutional cohesion, and increased active participation across all regions and chapters.',
  },
  {
    index: 2,
    title: 'Professional Alumni & Influential Ecosystem',
    subtitle: 'A globally connected professional alumni ecosystem.',
    purpose:
      'To establish SHESA as a credible platform for professional development, leadership growth, and alumni influence.',
    priorityAreas: [
      {
        title: 'Professional Networking and Collaboration Platforms',
        body: 'Development of structured digital and physical platforms for networking, business engagement, and sector collaboration.',
      },
      {
        title: 'Mentorship and Leadership Development Systems',
        body: 'Institutionalisation of mentorship frameworks and professional groups across generations.',
      },
      {
        title: 'Strategic Partnerships and Institutional Alliances',
        body: 'Development of partnerships with government, private sector, and international institutions.',
      },
      {
        title: 'Alumni Data and Management System',
        body: 'Establishment of a comprehensive alumni database to support coordination and engagement.',
      },
      {
        title: 'National Alumni Networks',
        body: 'Creation of a structured Alumni Network of Sister Associations.',
      },
    ],
    outcome:
      'A vibrant, globally connected professional alumni ecosystem that supports career development, mentorship, and leadership growth, with SHESA recognised as a credible platform for networking and collaboration.',
  },
  {
    index: 3,
    title: 'Financial Sustainability & Institutional Credibility',
    subtitle: 'A financially resilient, credible association.',
    purpose:
      'To ensure long-term institutional sustainability through strong branding, financial discipline, and governance credibility.',
    priorityAreas: [
      {
        title: 'SHESACU Development and Consolidation',
        body: 'Strengthening SHESA Credit Union as a key financial pillar.',
      },
      {
        title: 'Branding, Marketing and Communications Framework',
        body: 'Development of a unified global brand identity and communication strategy, with enhanced digital platforms and professional alumni content.',
      },
      {
        title: 'Revenue Diversification Strategy',
        body: 'Expansion of funding sources beyond membership dues.',
      },
      {
        title: 'Financial Governance and Accountability Systems',
        body: 'Strengthening financial controls, transparency and reporting systems, with long-term financial planning and risk mitigation.',
      },
    ],
    outcome:
      'A financially resilient and institutionally credible association with diversified revenue streams, strong governance systems, and a unified global brand with increased visibility.',
  },
  {
    index: 4,
    title: 'Strategic Partnerships & Societal Impact',
    subtitle: 'A trusted development partner.',
    purpose:
      'To position SHESA as a credible development partner contributing to national and societal progress.',
    priorityAreas: [
      {
        title: 'Strategic Development Partnerships',
        body: 'Structured collaborations with government, NGOs, private sector, and international organisations.',
      },
      {
        title: 'Education and Youth Development Initiatives',
        body: 'Implementation of targeted programs supporting SAHECO and youth empowerment.',
      },
      {
        title: 'Community and National Development Engagement',
        body: 'Participation in initiatives aligned with national development priorities.',
      },
      {
        title: 'External Relations and Visibility Strategy',
        body: 'Strengthening SHESA’s profile as a credible and impact-oriented institution.',
      },
    ],
    outcome:
      'SHESA is recognised as a trusted development partner contributing meaningfully to education, youth empowerment, and community development, with measurable impact beyond its membership base.',
  },
];

export interface Phase {
  readonly index: 1 | 2 | 3;
  readonly years: string;
  readonly title: string;
  readonly milestones: readonly string[];
}

export const PHASES: readonly Phase[] = [
  {
    index: 1,
    years: '2026 - 2027',
    title: 'Foundation Phase',
    milestones: [
      'Constitution adoption and governance harmonisation',
      'Branch–Batch–Country Presidents’ Summit',
      'Digital database and Connect platform setup',
      'New digital financial system stood up',
      'Branding and communication framework rollout',
      'SHESACU strengthening begins',
      'SHESA Day in SAHECO kickstarted',
    ],
  },
  {
    index: 2,
    years: '2027 - 2028',
    title: 'Expansion Phase',
    milestones: [
      'Full operationalisation of the new constitution and governance structures',
      'Launch of networking and mentorship platforms',
      'Activation of strategic partnerships',
      'Rollout of welfare schemes',
      'SHESA Advanced Dispensary project realised',
    ],
  },
  {
    index: 3,
    years: '2029 - 2030',
    title: 'Consolidation Phase',
    milestones: [
      'Institutionalisation of systems across all branches',
      'Scale-up of partnerships and impact programs',
      'Financial sustainability achieved',
      'Comprehensive strategy evaluation and next-cycle planning',
    ],
  },
];

export const ACCOUNTABILITY: readonly {
  readonly level: string;
  readonly responsibilities: string;
}[] = [
  {
    level: 'General Assembly',
    responsibilities:
      'Adoption of the constitution, formulation of policies, compliance monitoring.',
  },
  {
    level: 'Global Executive (President General & EXCO)',
    responsibilities:
      'Policy direction, oversight, partnerships, global coordination, performance monitoring.',
  },
  {
    level: 'Country and Branch Executives',
    responsibilities:
      'Execution of programs, member engagement, data reporting, local mobilisation.',
  },
];

export const MONITORING_INDICATORS: readonly string[] = [
  'Membership growth rate (%)',
  'Active participation rate (%)',
  'Financial sustainability ratio (non-dues revenue %)',
  'Partnership index (number of active MoUs)',
  'Digital engagement rate (%)',
  'Program delivery rate (%)',
  'Governance compliance rate (%)',
];

export const FINANCIAL_FRAMEWORK = {
  overview: [
    'The financial sustainability of SHESA is central to the successful delivery of this Strategic Plan. The Association will transition from a predominantly dues-based model to a diversified, predictable, and transparent financial system, supported by technology and strong governance.',
    'The financial framework is anchored on three components: a digital financial management system (SHESA Finance Application), a revenue diversification and growth strategy, and the establishment of a SHESA Trust Fund.',
  ],
  financeApplication: {
    intro:
      'To strengthen accountability and transparency, SHESA will develop and deploy a centralised digital finance application with the following capabilities:',
    capabilities: [
      'Real-time tracking of member dues and contributions',
      'Branch-level financial reporting and consolidation',
      'Budget planning and expenditure monitoring',
      'Automated financial reporting dashboards',
      'Integration with the SHESA Connect platform',
    ],
    outcome:
      'A transparent, auditable, and efficient financial management system that enhances trust, compliance, and decision-making.',
  },
  revenue: {
    core: ['Membership dues', 'Branch contributions and levies'],
    expanded: [
      'Appeals and fundraising initiatives',
      'Corporate sponsorships and partnerships',
      'Professional events, conferences, and training programs',
      'Merchandise and branding initiatives',
      'Grants from development partners',
    ],
    longTerm: ['SHESA Trust Fund (endowment model)'],
  },
  expenditure: [
    'Digital infrastructure (platforms and systems)',
    'Alumni engagement and professional programs',
    'SAHECO development projects',
    'Welfare and insurance schemes',
    'Institutional strengthening and governance systems',
    'Strategic partnership initiatives',
  ],
  trustFund: {
    intro:
      'A SHESA Trust Fund will be established as a long-term financial sustainability mechanism.',
    objectives: [
      'Build a capital base to fund strategic projects',
      'Provide financial stability beyond annual contributions',
      'Support scholarships, infrastructure, and legacy projects',
    ],
    sources: [
      'Alumni contributions',
      'Legacy donations and endowments',
      'Institutional partnerships',
    ],
    outcome: 'A self-sustaining financial base that supports SHESA’s long-term ambitions.',
  },
  targets2030: [
    'At least 50% of revenue from non-dues sources',
    'Fully digitised financial management across all branches',
    'Annual audited financial statements across the network',
    'A fully operational Trust Fund with measurable capital growth',
  ],
} as const;

export interface RiskGroup {
  readonly title: string;
  readonly risks: readonly string[];
  readonly mitigations: readonly string[];
}

export const RISKS: readonly RiskGroup[] = [
  {
    title: 'Governance',
    risks: [
      'Fragmentation across branches',
      'Non-compliance with constitutional provisions',
      'Leadership conflicts',
    ],
    mitigations: [
      'Adoption of a binding global constitution',
      'Clear governance architecture',
      'Compliance monitoring',
    ],
  },
  {
    title: 'Financial',
    risks: ['Irregular member contributions', 'Weak financial transparency'],
    mitigations: ['Finance application', 'Annual audits', 'Revenue diversification'],
  },
  {
    title: 'Operational',
    risks: ['Weak execution capacity', 'Low engagement'],
    mitigations: ['KPIs and monitoring', 'Capacity building', 'Digital engagement'],
  },
  {
    title: 'Reputational',
    risks: ['Poor communication', 'Failure to deliver'],
    mitigations: ['Branding strategy', 'Transparency', 'Consistent delivery'],
  },
  {
    title: 'External',
    risks: ['Economic instability', 'Regulatory changes'],
    mitigations: ['Flexible planning', 'Scenario reviews'],
  },
];

export const CALL_TO_ACTION = {
  paragraphs: [
    'The successful implementation of this Strategic Plan requires full commitment, discipline, and collective ownership from all SHESA members across the global network. This is a call to unity, responsibility, and purposeful action.',
    'All branches and members are expected to actively support implementation through effective participation, accountability, prompt reporting of activities and results, and responsible communication through official channels only.',
    'SHESA’s transformation will depend on the discipline of its members, the quality of reporting, and the integrity of communication at all levels.',
  ],
  closing: 'From intent to action. From affiliation to measurable contribution.',
} as const;

export const CONCLUSION = {
  paragraphs: [
    'This Strategic Plan for the period 2026–2030 marks a defining milestone in the evolution of SHESA. It reflects a clear and deliberate shift from legacy-driven operations toward a structured, modern, and globally connected alumni ecosystem.',
    'The strategy provides a coherent framework for strengthening governance, enhancing member engagement, ensuring financial sustainability, and expanding SHESA’s societal impact, anchored on unity, accountability, innovation, and shared responsibility.',
    'With oneness and consistency in action, SHESA is well positioned to emerge as a globally respected, professionally vibrant, and financially resilient alumni institution, delivering lasting value to its members and meaningful contribution to SAHECO and society at large.',
  ],
} as const;

export const SECTION_NAV: readonly { readonly id: string; readonly label: string }[] = [
  { id: 'executive-summary', label: 'Executive Summary' },
  { id: 'background', label: 'Background & Mandate' },
  { id: 'framework', label: 'Strategic Framework' },
  { id: 'goals', label: 'Strategic Goals' },
  { id: 'implementation', label: 'Implementation' },
  { id: 'financial', label: 'Financial Framework' },
  { id: 'risks', label: 'Risk Management' },
  { id: 'call-to-action', label: 'Call to Action' },
  { id: 'conclusion', label: 'Conclusion' },
];
