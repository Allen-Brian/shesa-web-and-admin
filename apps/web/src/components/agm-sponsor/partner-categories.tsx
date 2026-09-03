'use client';

import { motion } from 'framer-motion';

import { PARTNER_CATEGORIES } from './agm-sponsor-content';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

/**
 * Four buckets: institutional (govt/ministry), diplomatic (missions),
 * corporate (paid tiers), and media (in-kind). The public examples
 * list uses office/organisation names only, no internal "warm
 * contact" annotations from the outreach doc.
 */
export function PartnerCategories() {
  return (
    <section id="categories" className="relative py-24 text-black md:py-28">
      <div className="mx-auto max-w-6xl px-5 md:px-8 lg:px-12">
        <div className="max-w-3xl">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.7, ease }}
            className="font-heading text-[11px] font-medium uppercase tracking-[0.32em] text-primary"
          >
            Categories of partnership
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.85, delay: 0.1, ease }}
            className="mt-5 font-heading font-thin leading-[1.1] text-black"
            style={{ fontSize: 'clamp(1.85rem, 3.6vw, 3rem)', letterSpacing: '-0.02em' }}
          >
            Four ways to walk into the AGM 2026.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.85, delay: 0.18, ease }}
            className="mt-5 max-w-2xl text-[15px] leading-[1.8] text-black/65"
          >
            Not every partner engages the same way. Institutional partners join by protocol,
            diplomatic missions by bilateral engagement, corporate partners through the commercial
            tiers, and media by coverage exchange.
          </motion.p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2 md:gap-8">
          {PARTNER_CATEGORIES.map((c, i) => (
            <motion.article
              key={c.key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.85, delay: i * 0.08, ease }}
              className="relative overflow-hidden rounded-xs border border-black/10 bg-white p-7 md:p-8"
            >
              <span aria-hidden className="absolute left-0 top-0 h-full w-[3px] bg-primary/80" />
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h3
                  className="font-heading text-xl font-medium text-black md:text-[1.4rem]"
                  style={{ letterSpacing: '-0.015em' }}
                >
                  {c.title}
                </h3>
                <p className="font-heading text-[10px] font-medium uppercase tracking-[0.28em] text-primary/80">
                  {c.nature}
                </p>
              </div>

              <p className="mt-4 text-[14px] leading-[1.8] text-black/70">{c.description}</p>

              <div className="mt-6 border-t border-black/8 pt-5">
                <p className="font-heading text-[10px] font-medium uppercase tracking-[0.24em] text-black/50">
                  Examples
                </p>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {c.examples.map((e) => (
                    <li
                      key={e}
                      className="grid grid-cols-[16px_1fr] items-baseline gap-2 text-[13px] leading-[1.65] text-black/75"
                    >
                      <span
                        aria-hidden
                        className="mt-1 h-1.5 w-1.5 rotate-45 bg-primary/70"
                        style={{ marginLeft: 4 }}
                      />
                      <span>{e}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="mt-6 rounded-xs bg-primary/6 p-4 text-[13px] leading-[1.65] text-black/70">
                {c.cta}
              </p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
