import type { Award, AwardCategory } from '@/lib/awards';

/**
 * Every award on offer, grouped as the briefing groups them.
 *
 * It sits above the form rather than inside it. Somebody arriving from a
 * WhatsApp link has no idea what nineteen awards there are, and choosing
 * well needs the whole list in one view — the form's search box is for
 * getting to a decision you have already made.
 */
export function AwardsBoard({
  categories,
  awards,
}: {
  readonly categories: readonly AwardCategory[];
  readonly awards: readonly Award[];
}) {
  const standalone = awards.filter((a) => a.categoryId === null);
  const grouped = categories
    .map((c) => ({ category: c, items: awards.filter((a) => a.categoryId === c.id) }))
    .filter((g) => g.items.length > 0);

  if (awards.length === 0) return null;

  return (
    <section className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-350 px-5 md:px-8 lg:px-12">
        <p className="font-heading text-sm font-medium uppercase tracking-[0.28em] text-primary">
          The awards
        </p>
        <h2
          className="mt-5 max-w-3xl font-heading font-thin leading-[1.08] text-black"
          style={{ fontSize: 'clamp(1.85rem, 4vw, 3.25rem)', letterSpacing: '-0.02em' }}
        >
          {awards.length} awards, one nomination round.
        </h2>

        <div className="mt-14 flex flex-col gap-14 md:mt-20 md:gap-16">
          {grouped.map(({ category, items }) => (
            <div key={category.id}>
              <p className="font-heading text-[13px] font-medium uppercase tracking-[0.3em] text-primary">
                {category.name}
              </p>
              {category.description && (
                <p className="mt-1.5 max-w-xl text-[12.5px] leading-relaxed text-black/45">
                  {category.description}
                </p>
              )}
              <ul className="mt-6 grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((a) => (
                  <AwardRow key={a.id} award={a} />
                ))}
              </ul>
            </div>
          ))}

          {standalone.length > 0 && (
            <div>
              <p className="font-heading text-[13px] font-medium uppercase tracking-[0.3em] text-primary">
                Collective awards
              </p>
              <p className="mt-1.5 max-w-xl text-[12.5px] leading-relaxed text-black/45">
                For a branch or a chapter rather than an individual.
              </p>
              <ul className="mt-6 grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
                {standalone.map((a) => (
                  <AwardRow key={a.id} award={a} />
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function AwardRow({ award }: { readonly award: Award }) {
  return (
    <li className="border-t border-black/10 py-4">
      <p className="font-heading text-[15.5px] font-light leading-snug text-black">{award.name}</p>
      {award.description && (
        <p className="mt-1 text-[12.5px] leading-relaxed text-black/45">{award.description}</p>
      )}
    </li>
  );
}
