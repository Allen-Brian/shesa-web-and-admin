import type { LegalSectionData } from '@/components/legal/legal-section';

/**
 * Privacy Policy, SHESA Alumni public web platform.
 *
 * Template content tailored to SHESA's actual operating context.
 * Discloses the categories of data collected across the public site,
 * the members-only Connect platform, and the payment flows. Should
 * be reviewed by the Association's legal counsel before the first
 * production go-live and updated whenever the underlying processing
 * changes (new payment provider, new integration, etc).
 */
export const PRIVACY_META = {
  eyebrow: 'Legal · Privacy Policy',
  title: 'How SHESA collects and uses your data.',
  summary:
    'This Privacy Policy explains what personal information the Sacred Heart Ex-Students’ Association collects when you use our public website, register as a member, buy a ticket, or make a donation, and how we protect and share that information.',
  effectiveDate: '23 July 2026',
  version: 'v1.0',
} as const;

export const PRIVACY_SECTIONS: readonly LegalSectionData[] = [
  {
    number: '1',
    heading: 'Who is the data controller',
    paragraphs: [
      'The Sacred Heart Ex-Students’ Association (“SHESA”, “we”, “us”, “our”), an alumni association duly registered under the Cameroonian 1990 Law on Freedom of Association, is the data controller for personal data processed through our Services. The Services include the public website (shesaconnect.com), the members-only Connect platform, and the associated payment and event flows.',
      'For any question about this Policy or your data, contact the SHESA Secretariat at hello@shesaconnect.com.',
    ],
  },
  {
    number: '2',
    heading: 'What personal information we collect',
    paragraphs: [
      'The categories of personal data we collect depend on how you interact with the Services:',
    ],
    bullets: [
      'Identity data, full name, matricule (if applicable), batch, house, and profile picture.',
      'Contact data, email address, mobile number, and postal address of your branch chapter.',
      'Account data, credentials, security tokens, and role/permission assignments within SHESA.',
      'Payment data, amount, currency, method (MTN MoMo, Orange Money, card, bank transfer, cash), payer name or donor name for public flows, transaction identifiers, and receipt numbers. Full card numbers are handled by our payment processors, never stored by SHESA.',
      'Event data, ticket quantity, attire measurements, guest list details, and any preferences you provide during AGM or event registration.',
      'Communications, messages you send us, replies you post inside member channels, and email delivery events (opens, bounces).',
      'Technical data, device type, browser, IP address, general location, and interaction events collected via our analytics tools.',
    ],
  },
  {
    number: '3',
    heading: 'How we use your data',
    paragraphs: [
      'We use personal data only for legitimate purposes connected to SHESA’s mandate as an alumni association:',
    ],
    bullets: [
      'To operate the Services and provide the features you request (registration, ticket purchase, donation receipts, member directory).',
      'To manage your membership, dues, contributions, and welfare records.',
      'To send you transactional notifications, receipts, event reminders, membership status updates.',
      'To keep you informed of SHESA news, events, and initiatives (you can opt out at any time).',
      'To improve the Services, diagnose technical issues, and secure the platform against abuse.',
      'To comply with legal, tax, and audit obligations that apply to the Association.',
    ],
  },
  {
    number: '4',
    heading: 'Legal bases for processing',
    paragraphs: ['Where applicable, we rely on the following legal bases:'],
    bullets: [
      'Performance of a membership agreement, for member registration, dues tracking, and welfare administration.',
      'Legitimate interests of the Association, for operating the platform, protecting the community, and coordinating chapters, provided your rights and interests do not override those interests.',
      'Consent, for optional communications, non-essential cookies, and any processing not otherwise covered by a legal basis. You may withdraw consent at any time.',
      'Legal obligation, for tax reporting, audit requirements, and compliance with Cameroonian law.',
    ],
  },
  {
    number: '5',
    heading: 'Cookies and analytics',
    paragraphs: [
      'The public website uses a small number of cookies and similar technologies. Strictly necessary cookies keep sessions signed in and preserve preferences. Analytics cookies help us understand which sections are most useful, always in aggregated form. See our Cookie Policy for a full inventory.',
    ],
  },
  {
    number: '6',
    heading: 'How we share your data',
    paragraphs: [
      'SHESA does not sell your personal data. We share data only with the categories of recipients required to run the Services or to comply with the law:',
    ],
    bullets: [
      'Payment processors, MTN Mobile Money, Orange Money, card acquirers, and banking partners, to process payments, refunds, and reconciliation.',
      'Cloud infrastructure providers, including Supabase and our VPS hosting partner, to store data and run the platform.',
      'Email delivery and analytics providers, to send transactional messages and to understand aggregate usage of the Services.',
      'Auditors, legal advisors, and regulators, where necessary to comply with legal obligations.',
      'Other SHESA officers and executives, strictly limited to the officers whose role requires access (e.g. the Treasurer for financial data, the Membership Secretary for the member directory).',
    ],
    note: 'We enter written arrangements with third-party processors that require them to protect your data and use it only for the purposes we specify.',
  },
  {
    number: '7',
    heading: 'International data transfers',
    paragraphs: [
      'Some of our providers operate outside of Cameroon. Where personal data is transferred internationally, we take reasonable steps, including contractual safeguards, to ensure that the level of protection travels with the data.',
    ],
  },
  {
    number: '8',
    heading: 'How long we keep your data',
    paragraphs: [
      'We keep personal data only for as long as necessary to fulfil the purposes for which it was collected, or as required by law. In practice:',
    ],
    bullets: [
      'Membership and directory records are kept for as long as you remain an active member, and archived thereafter for historical continuity of the Association.',
      'Payment and financial records are retained for at least ten (10) years to satisfy audit and tax requirements.',
      'Event registration records are retained for the duration of the event cycle plus a reasonable archival period.',
      'Analytics data is retained in aggregated form and is not tied to your individual account.',
    ],
  },
  {
    number: '9',
    heading: 'Your rights',
    paragraphs: ['Depending on your jurisdiction, you may have the right to:'],
    bullets: [
      'Access the personal data we hold about you.',
      'Request correction of data that is inaccurate or incomplete.',
      'Request deletion of your data, subject to legal, financial, and archival retention obligations.',
      'Object to or restrict certain kinds of processing.',
      'Withdraw consent where processing is based on consent.',
      'Request a copy of your data in a portable format.',
    ],
    note: 'To exercise any of these rights, contact us at hello@shesaconnect.com. We will respond within a reasonable timeframe. If you consider that we have not addressed your concern, you may lodge a complaint with the competent data-protection authority in your jurisdiction.',
  },
  {
    number: '10',
    heading: 'Security',
    paragraphs: [
      'We implement reasonable technical and organisational measures to protect personal data against loss, misuse, and unauthorised access, including encryption in transit, access controls, and audit logging. No system can be guaranteed 100% secure; we therefore also rely on member vigilance (strong passwords, careful handling of credentials, prompt reporting of suspected incidents).',
    ],
  },
  {
    number: '11',
    heading: 'Children',
    paragraphs: [
      'The Services are not directed to children under the age of eighteen (18). We do not knowingly collect personal data from minors. If we learn that we have inadvertently collected such data, we will delete it.',
    ],
  },
  {
    number: '12',
    heading: 'Changes to this Policy',
    paragraphs: [
      'We may update this Policy from time to time to reflect changes in the Services, the law, or our practices. Updated Policies are effective as of the effective date shown at the top of this page. For material changes, we will notify members through the Services or by email prior to the effective date.',
    ],
  },
  {
    number: '13',
    heading: 'Contact',
    paragraphs: [
      'For any question, complaint, or notice under this Privacy Policy, contact the SHESA Secretariat at hello@shesaconnect.com or via the contact page.',
    ],
  },
];
