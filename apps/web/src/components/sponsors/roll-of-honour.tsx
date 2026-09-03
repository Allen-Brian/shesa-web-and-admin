'use client';

import { motion, type Variants } from 'framer-motion';

import { sponsorTiers, sponsors } from './sponsors-content';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.04, ease },
  }),
};

/**
 * Roll-of-honour list, sponsors grouped by tier. Feels like the
 * printed brochure back-cover. Each name is a plain text line (no
 * links) because the source-of-truth is the printed programme.
 */
export function RollOfHonour() {
  return (
    <section className="relative bg-white py-20 text-black md:py-24">
      <div className="mx-auto max-w-350 px-5 md:px-8 lg:px-12">
        <div className="grid gap-8 md:grid-cols-12 md:items-end md:gap-14">
          <div className="md:col-span-8">
            <motion.p
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.6 }}
              variants={fadeUp}
              className="font-heading text-sm font-medium uppercase tracking-[0.28em] text-primary"
            >
              Roll of Honour
            </motion.p>
            <motion.h2
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.4 }}
              variants={fadeUp}
              custom={1}
              className="mt-5 font-heading font-thin leading-[1.05] text-black"
              style={{ fontSize: 'clamp(1.75rem, 3.4vw, 3rem)', letterSpacing: '-0.02em' }}
            >
              The names that <span className="italic text-primary">said yes.</span>
            </motion.h2>
          </div>
          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            variants={fadeUp}
            custom={2}
            className="max-w-md text-[15px] leading-[1.7] text-black/60 md:col-span-4"
          >
            Institutions, chapters, and businesses who chose to stand behind SHESA this year.
          </motion.p>
        </div>

        <div className="mt-12 flex flex-col gap-12 md:mt-16">
          {sponsorTiers.map((tier) => {
            const rows = sponsors.filter((s) => s.tier === tier.slug);
            if (rows.length === 0) return null;
            return (
              <div key={tier.slug} className="border-t border-black/10 pt-8">
                <div className="flex items-baseline justify-between gap-6">
                  <p className="font-heading text-[11px] font-medium uppercase tracking-[0.28em] text-primary">
                    {tier.name}
                  </p>
                  <span className="text-[11px] uppercase tracking-[0.2em] text-black/45 tabular-nums">
                    {rows.length} {rows.length === 1 ? 'partner' : 'partners'}
                  </span>
                </div>
                <ul className="mt-6 grid grid-cols-1 gap-x-10 gap-y-3 sm:grid-cols-2 md:grid-cols-3">
                  {rows.map((s, i) => (
                    <motion.li
                      key={s.name}
                      initial="hidden"
                      whileInView="visible"
                      viewport={{ once: true, amount: 0.6 }}
                      variants={fadeUp}
                      custom={i}
                      className="flex items-baseline justify-between gap-4 border-b border-black/8 pb-2 leading-tight"
                    >
                      <span
                        className="font-heading text-[14.5px] font-light text-black"
                        style={{ letterSpacing: '-0.005em' }}
                      >
                        {s.name}
                      </span>
                      <span className="text-[10.5px] uppercase tracking-[0.2em] text-black/45">
                        {s.city}
                      </span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
