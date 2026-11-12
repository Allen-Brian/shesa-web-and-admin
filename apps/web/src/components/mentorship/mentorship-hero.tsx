'use client';

import Image from 'next/image';
import { motion, type Variants } from 'framer-motion';

import { CIRCLES } from './mentorship-content';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, delay: i * 0.12, ease },
  }),
};

export function MentorshipHero() {
  return (
    <section
      data-nav-dark
      className="relative isolate flex min-h-[62svh] w-full items-center overflow-hidden bg-black pb-16 pt-32 text-white md:pt-40"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-20 overflow-hidden">
        <Image
          src="/hero_five.jpg"
          alt=""
          fill
          priority
          quality={45}
          sizes="100vw"
          className="object-cover opacity-20"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(90% 70% at 50% 40%, transparent 0%, rgba(0,0,0,0.75) 70%, #000 100%)',
          }}
        />
      </div>

      <div className="mx-auto w-full max-w-350 px-5 md:px-8 lg:px-12">
        <div className="max-w-3xl">
          <motion.p
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="font-heading text-sm font-medium uppercase tracking-[0.28em] text-primary"
          >
            Mentorship
          </motion.p>

          <motion.h1
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={1}
            className="mt-5 font-heading font-thin leading-[1.04] text-white"
            style={{ fontSize: 'clamp(2.1rem, 5.2vw, 4.4rem)', letterSpacing: '-0.02em' }}
          >
            Somebody here has already done{' '}
            <span className="italic text-primary">the thing you are trying to do.</span>
          </motion.h1>

          <motion.p
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={2}
            className="mt-7 max-w-xl text-[15.5px] leading-[1.75] text-white/65"
          >
            {CIRCLES.length} rooms, split by field. They are WhatsApp groups, so there is nothing to
            sign up for and nothing to install that you do not already have. Find the one that
            matches what you do, and join it.
          </motion.p>

          <motion.p
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={3}
            className="mt-4 text-[14px] leading-[1.7] text-white/40"
          >
            Join as many as genuinely fit. Nobody is counting, but a room full of people who are
            only half in it is worth less than a small one that is paying attention.
          </motion.p>
        </div>
      </div>
    </section>
  );
}
