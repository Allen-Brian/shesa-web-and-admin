import type { LegalSectionData } from '@/components/legal/legal-section';

/**
 * Terms of Service, SHESA Alumni public web platform.
 *
 * Template content tailored to SHESA's actual operating context
 * (Cameroon-based alumni association, member registrations, AGM
 * ticketing, donations via mobile money / cards / bank transfer).
 * Should be reviewed by the Association's legal counsel before the
 * first production go-live.
 */
export const TERMS_META = {
  eyebrow: 'Legal · Terms of Service',
  title: 'The rules for using SHESA services.',
  summary:
    'These Terms of Service govern your use of the SHESA public website, the members-only Connect platform, and any related services operated by the Sacred Heart Ex-Students’ Association. Please read them carefully before creating an account, registering for events, or making payments.',
  effectiveDate: '23 July 2026',
  version: 'v1.0',
} as const;

export const TERMS_SECTIONS: readonly LegalSectionData[] = [
  {
    number: '1',
    heading: 'About SHESA and these Terms',
    paragraphs: [
      'The Sacred Heart Ex-Students’ Association (“SHESA”, “we”, “us”, “our”) is the official alumni body of Sacred Heart College Mankon (SAHECO), duly registered under the Cameroonian 1990 Law on Freedom of Association. SHESA operates this website (shesaconnect.com), the members-only Connect platform, and event and payment services accessible through them (together, the “Services”).',
      'By accessing or using the Services, you agree to be bound by these Terms of Service (the “Terms”). If you do not agree, you must stop using the Services.',
    ],
  },
  {
    number: '2',
    heading: 'Eligibility and accounts',
    paragraphs: [
      'The members-only areas of the Services are reserved for alumni of Sacred Heart College Mankon and other persons expressly admitted by SHESA. Public pages (news, events, gallery, and donation flows) are open to the general public.',
      'To register as a member, you must be at least eighteen (18) years old and provide accurate registration information, including your full name, matricule where applicable, batch, and contact details. You are responsible for keeping your account credentials confidential and for all activity that occurs under your account.',
    ],
    bullets: [
      'Register in your own name; do not create accounts on behalf of others without their consent.',
      'Keep your account information current, especially email and mobile number, which we use for verification and receipts.',
      'Notify us immediately at hello@shesaconnect.com if you suspect unauthorised use of your account.',
    ],
  },
  {
    number: '3',
    heading: 'Acceptable use',
    paragraphs: [
      'You agree to use the Services in a manner consistent with the Association’s constitution, its values, and applicable law. In particular, you agree not to:',
    ],
    bullets: [
      'Post or share content that is unlawful, defamatory, harassing, discriminatory, or otherwise harmful.',
      'Impersonate any person or misrepresent your affiliation with SHESA or SAHECO.',
      'Attempt to gain unauthorised access to the Services, other accounts, or the underlying infrastructure.',
      'Use the Services to distribute spam, malware, or any content that infringes the intellectual property of others.',
      'Scrape, republish, or commercially exploit the member directory or other member data without prior written consent.',
    ],
    note: 'SHESA may suspend or terminate access to the Services, without prior notice, where a member materially breaches these Terms or where continued access would harm the Association or its members.',
  },
  {
    number: '4',
    heading: 'Membership dues, contributions, and payments',
    paragraphs: [
      'Membership dues, event registration fees, donations, and other contributions are payable through the payment channels offered on the Services, including MTN Mobile Money, Orange Money, Visa/MasterCard, and bank transfer. Payments may also be recorded manually by an authorised branch officer.',
      'All amounts are denominated in Central African CFA francs (XAF) unless otherwise stated. Amounts collected are held by SHESA and applied strictly toward the purposes for which they were contributed, programmatic delivery, member welfare, SAHECO support, and general operating costs of the Association.',
    ],
    bullets: [
      'Ticket purchases (for AGMs and other events) are non-transferable and non-refundable unless the event is cancelled by SHESA.',
      'Donations are voluntary and non-refundable once the payment has cleared, except in cases of clear duplicate charges or provable transaction error.',
      'Membership dues are annual and are due in accordance with the fiscal calendar adopted by the Executive Committee.',
    ],
  },
  {
    number: '5',
    heading: 'Refunds and cancellations',
    paragraphs: [
      'Refund requests are handled on a case-by-case basis by the SHESA Treasurer. To submit a refund request, email hello@shesaconnect.com from the address associated with the payment and include the receipt number displayed on your confirmation page.',
      'Where a refund is approved, funds will be returned via the original payment channel where possible, or by bank transfer where the original channel does not support refunds. Processing times depend on the underlying payment provider.',
    ],
  },
  {
    number: '6',
    heading: 'User-generated content',
    paragraphs: [
      'Where the Services allow you to submit content, messages, images, biographical details, announcements, you retain ownership of that content. By submitting it, you grant SHESA a non-exclusive, worldwide, royalty-free licence to host, reproduce, and display the content solely for the purpose of operating and improving the Services and communicating with the alumni community.',
      'You are solely responsible for the accuracy and lawfulness of content you submit. SHESA reserves the right to remove content that violates these Terms, the Code of Conduct, or applicable law.',
    ],
  },
  {
    number: '7',
    heading: 'Intellectual property',
    paragraphs: [
      'The SHESA name, crest, logo, motto (“Viriliter Age”), and all associated trademarks, together with the design, code, and content of the Services (other than user-submitted content), are the property of SHESA or its licensors and are protected by intellectual property laws.',
      'You may not copy, reproduce, or use SHESA branding for commercial purposes without prior written consent from the Executive Committee.',
    ],
  },
  {
    number: '8',
    heading: 'Third-party services',
    paragraphs: [
      'The Services rely on third-party providers, including payment processors (MTN, Orange, card acquirers, banking partners), cloud infrastructure providers, email delivery services, and analytics tools. Your interaction with those providers is subject to their own terms and privacy policies.',
      'SHESA is not liable for failures, downtime, or losses caused by third-party services outside of its reasonable control.',
    ],
  },
  {
    number: '9',
    heading: 'Disclaimers and limitation of liability',
    paragraphs: [
      'The Services are provided on an “as is” and “as available” basis. SHESA does not warrant that the Services will be uninterrupted, error-free, or free from harmful components. To the fullest extent permitted by law, SHESA disclaims all implied warranties.',
      'To the fullest extent permitted by law, SHESA’s aggregate liability arising out of or relating to the Services shall not exceed the total amounts paid by you to SHESA in the twelve (12) months preceding the event giving rise to the claim. Nothing in these Terms limits liability that cannot be limited by law, including for fraud, wilful misconduct, or gross negligence.',
    ],
  },
  {
    number: '10',
    heading: 'Changes to these Terms',
    paragraphs: [
      'SHESA may amend these Terms from time to time, for example, to reflect changes in the Services, the law, or the Association’s constitutional framework. Updated Terms are effective as of the effective date shown at the top of this page.',
      'For material changes, SHESA will notify members through the Services or by email prior to the effective date. Continued use of the Services after the effective date constitutes acceptance of the updated Terms.',
    ],
  },
  {
    number: '11',
    heading: 'Governing law and dispute resolution',
    paragraphs: [
      'These Terms are governed by the laws of the Republic of Cameroon. Any dispute arising out of or relating to these Terms or the Services shall be resolved first by good-faith negotiation between the parties. Failing that, the dispute shall be submitted to the competent courts of Yaoundé, Cameroon.',
    ],
  },
  {
    number: '12',
    heading: 'Contact',
    paragraphs: [
      'Questions, complaints, or notices under these Terms should be sent to the SHESA Secretariat at hello@shesaconnect.com or via the contact page.',
    ],
  },
];
