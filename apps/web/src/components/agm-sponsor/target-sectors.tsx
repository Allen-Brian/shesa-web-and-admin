'use client';

import { motion } from 'framer-motion';

import { TARGET_SECTORS } from './agm-sponsor-content';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

/**
 * The commercial sectors SHESA is actively targeting for AGM 2026
 * partnership. Named by industry only, never by specific organisation
 *, the internal target list stays internal.
 */
export function TargetSectors() {
  return (
    <section id="sectors" className="relative py-24 text-black md:py-28">
      <div className="mx-auto max-w-6xl px-5 md:px-8 lg:px-12">
        <div className="max-w-3xl">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.7, ease }}
            className="font-heading text-[11px] font-medium uppercase tracking-[0.32em] text-primary"
          >
            Sectors we&rsquo;re building around
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.85, delay: 0.1, ease }}
            className="mt-5 font-heading font-thin leading-[1.1] text-black"
            style={{ fontSize: 'clamp(1.85rem, 3.6vw, 3rem)', letterSpacing: '-0.02em' }}
          >
            The natural fits for AGM 2026.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.85, delay: 0.18, ease }}
            className="mt-5 max-w-2xl text-[15px] leading-[1.8] text-black/65"
          >
            These sectors match the AGM programme naturally, because of the audience in the room,
            the moments on the agenda, or the strategic themes SHESA is amplifying.
          </motion.p>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
          {TARGET_SECTORS.map((s, i) => (
            <motion.article
              key={s.key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.75, delay: i * 0.06, ease }}
              className="relative overflow-hidden rounded-xs border border-black/10 bg-white p-6"
            >
              <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-primary/80" />
              <p className="font-heading text-[10px] font-medium uppercase tracking-[0.24em] text-primary/80 tabular-nums">
                Sector · {String(i + 1).padStart(2, '0')}
              </p>
              <h3
                className="mt-3 font-heading text-[17px] font-medium leading-tight text-black"
                style={{ letterSpacing: '-0.005em' }}
              >
                {s.title}
              </h3>
              <p className="mt-3 text-[13px] leading-[1.7] text-black/65">{s.angle}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
