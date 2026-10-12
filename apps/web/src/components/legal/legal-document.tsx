'use client';

import { LegalSection, type LegalSectionData } from './legal-section';

interface Props {
  readonly sections: readonly LegalSectionData[];
  readonly contactHref: string;
  readonly contactEmail: string;
}

/**
 * Renders a full stack of legal sections plus the standard footer
 * contact block that both Terms and Privacy documents close with.
 * Every clause becomes an anchor via LegalSection so future links
 * like /privacy#your-rights work automatically.
 */
export function LegalDocument({ sections, contactHref, contactEmail }: Props) {
  return (
    <section className="relative py-20 text-black md:py-24">
      <div className="mx-auto max-w-4xl px-5 md:px-8 lg:px-12">
        <div className="flex flex-col gap-14 md:gap-16">
          {sections.map((s) => (
            <LegalSection key={s.number} {...s} />
          ))}
        </div>

        <div className="mt-20 rounded-xs border border-black/10 bg-white p-6 md:p-8">
          <p className="font-heading text-[11px] font-medium uppercase tracking-[0.28em] text-primary">
            Contact
          </p>
          <p className="mt-4 text-[14.5px] leading-[1.8] text-black/75">
            Questions about this document? Reach the SHESA Secretariat at{' '}
            <a
              href={`mailto:${contactEmail}`}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {contactEmail}
            </a>{' '}
            or via our{' '}
            <a
              href={contactHref}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              contact page
            </a>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
