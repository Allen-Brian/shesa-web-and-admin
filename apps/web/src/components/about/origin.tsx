'use client';

import Image from 'next/image';
import { motion, type Variants } from 'framer-motion';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.85, delay: i * 0.1, ease },
  }),
};

const highlights = [
  { number: '1962', label: 'Founded' },
  { number: 'Mill Hill', label: 'Missionaries' },
  { number: 'Mankon', label: 'Bamenda, Cameroon' },
] as const;

export function Origin() {
  return (
    <section className="relative overflow-hidden bg-white py-20 text-black md:py-28">
      <div className="mx-auto max-w-350 px-5 md:px-8 lg:px-12">
        <div className="grid gap-12 md:grid-cols-12 md:items-center md:gap-16 lg:gap-20">
          <motion.figure
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.9, ease }}
            className="relative md:col-span-5"
          >
            <span
              aria-hidden
              className="absolute -left-4 -top-4 h-full w-full rounded-sm bg-primary md:-left-6 md:-top-6"
            />
            <div className="relative aspect-4/5 overflow-hidden rounded-sm">
              <Image
                src="/hero_four.jpg"
                alt="Sacred Heart College, Mankon"
                fill
                sizes="(min-width: 768px) 40vw, 100vw"
                quality={75}
                className="object-cover"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background: 'linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)',
                }}
              />
              <figcaption className="absolute inset-x-0 bottom-0 p-5 text-white md:p-6">
                <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-white/80">
                  Sacred Heart College
                </p>
                <p className="mt-1 font-heading text-lg font-light tracking-tight md:text-xl">
                  Mankon · Bamenda
                </p>
              </figcaption>
            </div>
          </motion.figure>

          <div className="md:col-span-7">
            <motion.p
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.6 }}
              variants={fadeUp}
              className="font-heading text-sm font-medium uppercase tracking-[0.28em] text-primary"
            >
              The College
            </motion.p>

            <motion.h2
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.4 }}
              variants={fadeUp}
              custom={1}
              className="mt-5 font-heading font-thin leading-[1.05] text-black"
              style={{
                fontSize: 'clamp(1.85rem, 4vw, 3.5rem)',
                letterSpacing: '-0.02em',
              }}
            >
              Sacred Heart College, <span className="italic text-primary">Mankon.</span>
            </motion.h2>

            <motion.p
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.5 }}
              variants={fadeUp}
              custom={2}
              className="mt-6 max-w-xl text-[15.5px] leading-[1.75] text-black/70 md:text-base"
            >
              On a hillside in Mankon, in Cameroon's Northwest highlands, the{' '}
              <em className="not-italic font-medium text-black">Mill Hill Missionaries</em> opened
              the doors of Sacred Heart College in 1962. For six decades and counting, the college
              has shaped young men into scholars, priests, professionals, and leaders, with rigour,
              discipline, and an unmistakable Catholic ethos.
            </motion.p>

            <motion.p
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.5 }}
              variants={fadeUp}
              custom={3}
              className="mt-4 max-w-xl text-[15.5px] leading-[1.75] text-black/70 md:text-base"
            >
              What began as a modest boys' school in the highlands has grown into one of Cameroon's
              most storied institutions, a place where the sons of teachers, farmers, doctors, and
              public servants have sat side-by-side and become brothers for life.
            </motion.p>

            <div className="mt-10 grid grid-cols-3 gap-6 md:mt-12 md:gap-8">
              {highlights.map((h, i) => (
                <motion.div
                  key={h.label}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.6, delay: 0.4 + i * 0.1, ease }}
                >
                  <span aria-hidden className="mb-3 block h-px w-8 bg-primary" />
                  <p
                    className="font-heading font-light leading-none tracking-tight text-black"
                    style={{ fontSize: 'clamp(1.15rem, 2vw, 1.6rem)' }}
                  >
                    {h.number}
                  </p>
                  <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.2em] text-black/55">
                    {h.label}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
