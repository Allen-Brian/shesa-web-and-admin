'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';

import { PRESIDENTS_ADDRESS } from '@/components/president/presidents-address-content';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, delay: i * 0.1, ease },
  }),
};

export function PresidentsWord() {
  return (
    <section
      className="relative overflow-hidden bg-white py-20 text-black md:py-28"
      style={{
        backgroundImage:
          'linear-gradient(180deg, rgba(0,0,0,0) 0%, color-mix(in srgb, var(--color-primary) 3%, transparent) 100%)',
      }}
    >
      <div className="mx-auto max-w-350 px-5 md:px-8 lg:px-12">
        <div className="grid gap-14 md:grid-cols-12 md:items-center md:gap-16 lg:gap-20">
          <motion.figure
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.9, ease }}
            className="relative md:col-span-5"
          >
            <span
              aria-hidden
              className="absolute -left-4 -top-4 h-full w-full rounded-md bg-primary md:-left-6 md:-top-6"
            />
            <div className="relative aspect-4/5 overflow-hidden rounded-md">
              <Image
                src="/president_one.jpg"
                alt={`${PRESIDENTS_ADDRESS.signatory.name}, President General of SHESA`}
                fill
                sizes="(min-width: 768px) 40vw, 100vw"
                quality={75}
                className="object-cover object-top"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background: 'linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)',
                }}
              />
              <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 text-white md:p-6">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-white/80">
                    SHESA
                  </p>
                  <p className="mt-1 font-heading text-lg font-light tracking-tight md:text-xl">
                    President General
                  </p>
                </div>
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
              A Word From The President General
            </motion.p>

            <motion.h2
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.4 }}
              variants={fadeUp}
              className="mt-5 font-heading font-thin leading-none text-black"
              style={{
                fontSize: 'clamp(2rem, 4.2vw, 3.75rem)',
                letterSpacing: '-0.02em',
              }}
            >
              The Shesa <span className="italic text-primary">We Want!</span>
            </motion.h2>

            <motion.blockquote
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.4 }}
              variants={fadeUp}
              className="relative mt-8 max-w-2xl"
            >
              <span
                aria-hidden
                className="absolute -left-2 -top-6 font-heading text-6xl leading-none text-primary md:-left-6 md:-top-8 md:text-7xl"
              >
                &ldquo;
              </span>
              <p className="text-[17px] leading-[1.75] text-black/75 md:text-[19px]">
                {PRESIDENTS_ADDRESS.excerpt}
              </p>
            </motion.blockquote>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.5 }}
              variants={fadeUp}
              className="mt-8 flex flex-wrap items-center gap-6"
            >
              <div className="flex items-center gap-4">
                <span className="h-px w-10 bg-primary" />
                <div>
                  <p className="font-heading text-sm font-medium tracking-wide text-black">
                    {PRESIDENTS_ADDRESS.signatory.name}
                  </p>
                  <p className="text-xs uppercase tracking-[0.24em] text-black/50">
                    {PRESIDENTS_ADDRESS.signatory.title}, SHESA
                  </p>
                </div>
              </div>

              <Link
                href="/presidents-address"
                className="group ml-auto inline-flex items-center gap-3 text-sm font-medium text-black transition-colors hover:text-primary"
              >
                Read the full address
                <span
                  aria-hidden
                  className="grid h-8 w-8 place-items-center rounded-xs border border-black/20 transition-all duration-300 group-hover:translate-x-1 group-hover:border-primary group-hover:bg-primary group-hover:text-white"
                >
                  →
                </span>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
