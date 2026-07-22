import { FundingForm } from './funding-form';

interface Props {
  readonly initialError?: string;
}

/**
 * Funding section on the AGM 2026 landing page. Wraps the funding
 * tier picker + donation form with a short intro headline. The four
 * tiers (Bronze / Silver / Gold / Platinum) each map to their own
 * seeded donation campaign inside the AGM 2026 group so Finance can
 * roll up per tier.
 */
export function FundingSection({ initialError }: Props) {
  return (
    <section
      id="funding"
      className="relative border-t border-black/10 bg-white pb-24 pt-16 md:pb-32 md:pt-24"
    >
      <div className="mx-auto max-w-350 px-5 md:px-8 lg:px-12">
        <div className="mb-10 flex flex-col gap-2 md:mb-14 md:max-w-2xl">
          <p className="font-heading text-[11px] font-medium uppercase tracking-[0.28em] text-primary">
            Funding
          </p>
          <h2
            className="font-heading font-thin leading-[1.1] text-black"
            style={{ fontSize: 'clamp(1.85rem, 4vw, 3.25rem)', letterSpacing: '-0.02em' }}
          >
            Back the Assembly. Any amount.
          </h2>
          <p className="text-[14.5px] leading-[1.7] text-black/60">
            Every AGM comes together on the strength of alumni who chip in. Pick a tier that fits,
            or write in any amount — every gift is credited to AGM 2026.
          </p>
        </div>
        <FundingForm initialError={initialError} />
      </div>
    </section>
  );
}
