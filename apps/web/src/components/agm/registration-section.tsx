import { RegistrationForm } from './registration-form';

interface Props {
  readonly initialError?: string;
}

/**
 * Registration section for AGM 2026. Only the ticket form lives here
 *, the tier picker went away when tickets became a flat unit price
 * (Attire + Funding tiers get their own dedicated sections when
 * their flavour lands).
 */
export function RegistrationSection({ initialError }: Props) {
  return (
    <section className="relative bg-white pb-24 pt-16 md:pb-32 md:pt-24">
      <div className="mx-auto max-w-350 px-5 md:px-8 lg:px-12">
        <RegistrationForm initialError={initialError} />
      </div>
    </section>
  );
}
