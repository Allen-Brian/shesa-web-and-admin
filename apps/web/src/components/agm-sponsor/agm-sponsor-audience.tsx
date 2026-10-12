'use client';

import { motion } from 'framer-motion';

import { AUDIENCE_IN_THE_ROOM } from './agm-sponsor-content';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

/**
 * "Who is in the room", the value proposition to a prospective
 * sponsor. Categories only, no named individuals: the doc lists
 * personal contacts but only the audience shape belongs on the
 * public page.
 */
export function AgmSponsorAudience() {
  return (
    <section
      id="audience"
      className="relative py-24 text-black md:py-28"
      style={{
        background:
          'linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 3%, white) 0%, color-mix(in srgb, var(--color-primary) 5%, white) 100%)',
      }}
    >
      <div className="mx-auto max-w-6xl px-5 md:px-8 lg:px-12">
        <div className="max-w-3xl">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.7, ease }}
            className="font-heading text-[11px] font-medium uppercase tracking-[0.32em] text-primary"
          >
            Who is in the room
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.85, delay: 0.1, ease }}
            className="mt-5 font-heading font-thin leading-[1.1] text-black"
            style={{ fontSize: 'clamp(1.85rem, 3.6vw, 3rem)', letterSpacing: '-0.02em' }}
          >
            The audience your brand meets across three days.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.85, delay: 0.18, ease }}
            className="mt-5 max-w-2xl text-[15px] leading-[1.8] text-black/65"
          >
            The AGM is a single room where public offices, foreign missions, and the private sector
            share the same programme. This is who the partnership puts you next to.
          </motion.p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
          {AUDIENCE_IN_THE_ROOM.map((a, i) => (
            <motion.article
              key={a.key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.75, delay: i * 0.06, ease }}
              className="relative overflow-hidden rounded-xs border border-black/10 bg-white p-6"
            >
              <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-primary/80" />
              <p
                className="font-heading text-[15px] font-medium text-black"
                style={{ letterSpacing: '-0.005em' }}
              >
                {a.label}
              </p>
              <p className="mt-3 text-[13px] leading-[1.7] text-black/60">{a.detail}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
