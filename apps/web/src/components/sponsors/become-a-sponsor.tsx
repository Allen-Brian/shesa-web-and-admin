'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

export function BecomeASponsor() {
  return (
    <section className="relative overflow-hidden bg-black py-20 text-white md:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 60% at 50% 40%, color-mix(in srgb, var(--color-primary) 22%, transparent) 0%, transparent 65%)',
        }}
      />

      <div className="relative mx-auto flex max-w-350 flex-col items-center px-5 text-center md:px-8 lg:px-12">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.7, ease }}
          className="font-heading text-[11px] font-medium uppercase text-primary md:text-xs"
          style={{ letterSpacing: '0.4em' }}
        >
          Become a sponsor
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.9, delay: 0.1, ease }}
          className="mt-6 font-heading font-thin leading-[1.05] text-white"
          style={{ fontSize: 'clamp(2rem, 4.4vw, 4rem)', letterSpacing: '-0.02em' }}
        >
          Put your name <span className="italic text-primary">next to ours.</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.9, delay: 0.2, ease }}
          className="mt-6 max-w-2xl text-[15px] leading-[1.8] text-white/70 md:text-base"
        >
          Every AGM is carried by the people and businesses who believe in what SHESA is building.
          If that's you, we'd love to talk.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.9, delay: 0.3, ease }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <Link
            href="/contact"
            className="group inline-flex items-center gap-3 rounded-xs bg-primary px-7 py-3.5 text-sm font-medium tracking-wide text-white transition-all duration-500 hover:-translate-y-0.5 hover:bg-white hover:text-primary"
          >
            Talk to the sponsorship team
            <span
              aria-hidden
              className="grid h-6 w-6 place-items-center rounded-xs bg-white/15 transition-transform group-hover:translate-x-1 group-hover:bg-primary/10"
            >
              →
            </span>
          </Link>
          <Link
            href="/agm-2026"
            className="inline-flex items-center gap-2 rounded-xs border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-medium tracking-wide text-white transition-colors hover:border-white/60"
          >
            View AGM 2026
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
