'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';

import { AGM_META } from './agm-content';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const FACTS = [
  { label: 'Halls in use', value: '3', detail: 'Grand hall, gala hall, cultural stage' },
  { label: 'Seats reserved', value: '1,800', detail: 'Including patron + benefactor lounges' },
  { label: 'Partner hotels', value: '6', detail: 'Within 10 minutes of the venue' },
];

export function AgmVenue() {
  return (
    <section className="relative overflow-hidden bg-black py-20 text-white md:py-24">
      <div className="mx-auto max-w-350 px-5 md:px-8 lg:px-12">
        <div className="grid gap-10 md:grid-cols-12 md:gap-14">
          <div className="md:col-span-6">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.7, ease }}
              className="font-heading text-sm font-medium uppercase tracking-[0.28em] text-primary"
            >
              The Venue
            </motion.p>

            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.85, delay: 0.05, ease }}
              className="mt-5 font-heading font-thin leading-[1.05] text-white"
              style={{ fontSize: 'clamp(1.85rem, 3.8vw, 3.5rem)', letterSpacing: '-0.02em' }}
            >
              {AGM_META.venue.split(' · ')[0]}{' '}
              <span className="italic text-primary">
                {AGM_META.venue.includes(' · ') ? AGM_META.venue.split(' · ')[1] : ''}
              </span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.85, delay: 0.15, ease }}
              className="mt-6 max-w-lg text-[15px] leading-[1.8] text-white/70 md:text-base"
            >
              A landmark of the capital, restored for the occasion. Every hall, every corridor,
              curated to hold the moments the AGM 2026 will make.
            </motion.p>

            <ul className="mt-10 flex flex-col divide-y divide-white/10 border-y border-white/10">
              {FACTS.map((f, i) => (
                <motion.li
                  key={f.label}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 0.6, delay: 0.1 + i * 0.08, ease }}
                  className="flex items-baseline justify-between gap-4 py-5"
                >
                  <div>
                    <p className="font-heading text-[11px] font-medium uppercase tracking-[0.24em] text-white/50">
                      {f.label}
                    </p>
                    <p className="mt-1 text-[13px] text-white/70">{f.detail}</p>
                  </div>
                  <span
                    className="font-heading font-thin leading-none tabular-nums text-white"
                    style={{ fontSize: 'clamp(1.75rem, 3.4vw, 2.75rem)' }}
                  >
                    {f.value}
                  </span>
                </motion.li>
              ))}
            </ul>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 1, ease }}
            className="md:col-span-6"
          >
            <div className="relative aspect-4/5 overflow-hidden rounded-xs border border-white/10">
              <Image
                src="/hero_four.jpg"
                alt="Palais des Congrès, Yaoundé"
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                quality={75}
                className="object-cover"
              />
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(180deg, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.7) 100%)',
                }}
              />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <p className="font-heading text-[11px] font-medium uppercase tracking-[0.28em] text-white/70">
                  Location
                </p>
                <p className="mt-1 font-heading text-lg font-light text-white md:text-xl">
                  {AGM_META.city}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
