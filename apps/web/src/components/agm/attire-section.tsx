import { AttireForm } from './attire-form';

interface Props {
  readonly initialError?: string;
}

/**
 * Attire section on the AGM 2026 landing page. Slim wrapper around the
 * Attire form + a short intro headline. Kept as a sibling of the
 * ticket registration so the two flows read as separate purchases,
 * not one bundled step.
 */
export function AttireSection({ initialError }: Props) {
  return (
    <section
      id="attire"
      className="relative scroll-mt-20 border-t border-black/10 bg-black/[0.02] pb-24 pt-16 md:pb-32 md:pt-24"
    >
      <div className="mx-auto max-w-350 px-5 md:px-8 lg:px-12">
        <div className="mb-10 flex flex-col gap-2 md:mb-14 md:max-w-2xl">
          <p className="font-heading text-[11px] font-medium uppercase tracking-[0.28em] text-primary">
            Uniform
          </p>
          <h2
            className="font-heading font-thin leading-[1.1] text-black"
            style={{ fontSize: 'clamp(1.85rem, 4vw, 3.25rem)', letterSpacing: '-0.02em' }}
          >
            Wear the new SHESA colours.
          </h2>
          <p className="text-[14.5px] leading-[1.7] text-black/60">
            The Assembly Day dress code is the new SHESA uniform. Order yours now, one flat price,
            one flat size decision. Pick-up on Saturday at Palais des Congrès.
          </p>
        </div>
        <AttireForm initialError={initialError} />
      </div>
    </section>
  );
}
