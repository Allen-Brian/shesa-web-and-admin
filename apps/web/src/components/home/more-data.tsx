'use client';

import { motion, type Variants } from 'framer-motion';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, delay: i * 0.1, ease },
  }),
};

type Datum = {
  readonly figure: string;
  readonly suffix?: string;
  readonly label: string;
  readonly body: string;
};

const data: readonly Datum[] = [
  {
    figure: '$2.4',
    suffix: 'M+',
    label: 'Community Investment',
    body: 'Money channelled back into schools, scholarships, and healthcare since the alumni fund opened its doors in 1988.',
  },
  {
    figure: '1,850',
    suffix: '+',
    label: 'Scholarships Awarded',
    body: 'Every graduate carries a leg-up story. For 1,850 of them, that leg-up was written on our letterhead.',
  },
  {
    figure: '45',
    suffix: '',
    label: 'Community Projects',
    body: 'From rural clinics to computer labs, we build the things our communities said they needed, then hand them over.',
  },
  {
    figure: '320',
    suffix: '+',
    label: 'Careers Launched',
    body: 'The mentorship pipeline that turns bright graduates into industry stalwarts, and industry stalwarts into mentors.',
  },
];

export function MoreData() {
  return (
    <section
      className="relative overflow-hidden py-20 text-black md:py-24"
      style={{
        background:
          'linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 3%, white) 0%, color-mix(in srgb, var(--color-primary) 6%, white) 100%)',
      }}
    >
      <div className="mx-auto max-w-350 px-5 md:px-8 lg:px-12">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.6 }}
            variants={fadeUp}
            className="font-heading text-sm font-medium uppercase tracking-[0.28em] text-primary"
          >
            The Receipts
          </motion.p>

          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            custom={1}
            className="mt-5 font-heading font-thin leading-[1.05] text-black"
            style={{
              fontSize: 'clamp(1.85rem, 3.8vw, 3.5rem)',
              letterSpacing: '-0.02em',
            }}
          >
            What the alumni fund <span className="italic text-primary">has done.</span>
          </motion.h2>

          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            variants={fadeUp}
            custom={2}
            className="mt-6 max-w-xl text-[15px] leading-[1.7] text-black/60 md:text-base"
          >
            Impact isn't a slogan, it's a ledger. Here's a peek at the ledger since we started
            keeping it.
          </motion.p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-x-10 gap-y-14 sm:grid-cols-2 md:mt-20 md:gap-x-16 md:gap-y-16">
          {data.map((d, i) => (
            <motion.article
              key={d.label}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.75, delay: 0.15 + i * 0.1, ease }}
              className="group relative"
            >
              <div className="flex items-baseline gap-1 leading-none tracking-tight">
                <span
                  className="font-heading font-medium text-black"
                  style={{ fontSize: 'clamp(2.75rem, 6vw, 5rem)' }}
                >
                  {d.figure}
                </span>
                {d.suffix && (
                  <span
                    className="font-heading font-medium text-primary"
                    style={{ fontSize: 'clamp(1.75rem, 3vw, 2.75rem)' }}
                  >
                    {d.suffix}
                  </span>
                )}
              </div>

              <div className="mt-5 flex items-center gap-3">
                <span
                  aria-hidden
                  className="h-px w-8 origin-left bg-primary transition-all duration-500 group-hover:w-12"
                />
                <p className="font-heading text-xs font-semibold uppercase tracking-[0.28em] text-black">
                  {d.label}
                </p>
              </div>

              <p className="mt-4 max-w-md text-[14.5px] leading-[1.65] text-black/60">{d.body}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
