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
      className="relative scroll-mt-20 border-t border-black/10 bg-white pb-24 pt-16 md:pb-32 md:pt-24"
    >
      <div className="mx-auto max-w-350 px-5 md:px-8 lg:px-12">
        <div className="mb-10 flex flex-col gap-2 md:mb-14 md:max-w-4xl">
          <p className="font-heading text-[11px] font-medium uppercase tracking-[0.28em] text-primary">
            Alumni funding
          </p>
          <h2
            className="font-heading font-thin leading-[1.1] text-black"
            style={{ fontSize: 'clamp(1.85rem, 4vw, 3.25rem)', letterSpacing: '-0.02em' }}
          >
            Back the Assembly. <span className="text-primary">Any amount.</span>
          </h2>
          <p className="text-[14.5px] leading-[1.7] text-black/60 md:max-w-xl">
            The alumni contribution path. Pick a tier that fits, or write in any amount, every gift
            is credited to AGM 2026.{' '}
            <a
              href="/agm-2026/sponsor"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Representing an organisation? See partnership options.
            </a>
          </p>
        </div>
        <FundingForm initialError={initialError} />
      </div>
    </section>
  );
}
