'use client';

import { motion, type Variants } from 'framer-motion';

import type { PublicOrganSector } from './organs-content';
import { OrganCard } from './organ-card';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, delay: i * 0.08, ease },
  }),
};

interface Props {
  readonly sectors: readonly PublicOrganSector[];
}

/**
 * Grouped list of every organ, one section per sector. Each section
 * carries a small heading (with count) followed by a responsive grid
 * of organ cards.
 */
export function OrgansSections({ sectors }: Props) {
  const nonEmpty = sectors.filter((s) => s.organs.length > 0);
  if (nonEmpty.length === 0) return null;

  return (
    <section
      className="relative overflow-hidden py-20 text-black md:py-24"
      style={{
        background:
          'linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 3%, white) 0%, color-mix(in srgb, var(--color-primary) 5%, white) 100%)',
      }}
    >
      <div className="mx-auto flex max-w-350 flex-col gap-20 px-5 md:px-8 lg:px-12">
        {nonEmpty.map((sector, sectorIdx) => (
          <div key={sector.id} className="flex flex-col gap-8">
            <div className="grid gap-6 md:grid-cols-12 md:items-end md:gap-10">
              <div className="md:col-span-8">
                <motion.p
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.6 }}
                  variants={fadeUp}
                  className="font-heading text-sm font-medium uppercase tracking-[0.28em] text-primary"
                >
                  Sector {String(sectorIdx + 1).padStart(2, '0')}
                </motion.p>
                <motion.h2
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.4 }}
                  variants={fadeUp}
                  custom={1}
                  className="mt-4 font-heading font-thin leading-[1.05] text-black"
                  style={{
                    fontSize: 'clamp(1.75rem, 3.4vw, 3rem)',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {sector.name}
                </motion.h2>
              </div>

              {sector.description && (
                <motion.p
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.5 }}
                  variants={fadeUp}
                  custom={2}
                  className="max-w-md text-[14.5px] leading-[1.7] text-black/60 md:col-span-4 md:pb-2"
                >
                  {sector.description}
                </motion.p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6 xl:grid-cols-3">
              {sector.organs.map((organ, i) => (
                <OrganCard key={organ.id} organ={organ} index={i} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
