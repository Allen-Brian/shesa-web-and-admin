'use client';

import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import { Award, Camera, Clapperboard, FileText, Gavel, type LucideIcon } from 'lucide-react';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.85, delay: i * 0.08, ease },
  }),
};

interface RecapItem {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly body: string;
}

/**
 * What the recap will hold. Stated as promises of *kinds* of content,
 * not as numbers, so nothing here goes stale or has to be checked
 * before the material itself arrives.
 */
const RECAP: readonly RecapItem[] = [
  {
    icon: Camera,
    title: 'The photographs',
    body: 'Every session, from the Friday tournament to the last dance of the gala night.',
  },
  {
    icon: Clapperboard,
    title: 'The film',
    body: 'Highlights of the march past, the keynote and the moments the room stood up.',
  },
  {
    icon: Gavel,
    title: 'The resolutions',
    body: 'What the General Assembly decided, and the mandate the new year starts with.',
  },
  {
    icon: Award,
    title: 'The winners',
    body: 'The tournament champions and every name called on awards night.',
  },
  {
    icon: FileText,
    title: 'The reports',
    body: 'The accounts and reports presented to the assembly, for every member to read.',
  },
];

/**
 * The AGM page after the event: a promise of what is coming, in place of
 * the registration, attire and funding forms. Anchored at `#recap`, which
 * the hero and the home page's quick links point to.
 */
export function AgmRecap() {
  return (
    <section id="recap" className="relative scroll-mt-24 bg-white py-20 text-black md:py-28">
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
              The recap
            </motion.p>
            <motion.h2
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.4 }}
              variants={fadeUp}
              custom={1}
              className="mt-5 font-heading font-thin leading-[1.05] text-black"
              style={{ fontSize: 'clamp(1.85rem, 3.8vw, 3.5rem)', letterSpacing: '-0.02em' }}
            >
              Three days in Yaoundé, <span className="italic text-primary">on the record.</span>
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
            Thank you to every Shesan who made the journey, and to everyone who followed from afar.
            We are gathering everything from the assembly into one place. It lands here first.
          </motion.p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
          {RECAP.map((item, i) => (
            <motion.article
              key={item.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.7, delay: 0.1 + i * 0.08, ease }}
              className="group relative flex flex-col rounded-xs border border-black/10 bg-white p-6 transition-colors duration-500 hover:border-primary/40"
            >
              <div className="flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
                  <item.icon className="h-[18px] w-[18px]" strokeWidth={1.6} aria-hidden />
                </span>
                <span className="inline-flex items-center gap-1.5 font-heading text-[10px] font-semibold uppercase tracking-[0.22em] text-black/45">
                  <motion.span
                    aria-hidden
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.2 }}
                    className="h-1.5 w-1.5 rounded-full bg-primary"
                  />
                  Coming soon
                </span>
              </div>
              <h3
                className="mt-6 font-heading font-light leading-tight text-black"
                style={{ fontSize: 'clamp(1.15rem, 1.5vw, 1.4rem)' }}
              >
                {item.title}
              </h3>
              <p className="mt-2 text-[13.5px] leading-[1.65] text-black/60">{item.body}</p>
            </motion.article>
          ))}
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={fadeUp}
          custom={3}
          className="mt-14 flex flex-col items-start gap-4 border-t border-black/10 pt-10 sm:flex-row sm:items-center sm:justify-between"
        >
          <p
            className="font-script text-primary"
            style={{ fontSize: 'clamp(1.6rem, 2.6vw, 2.4rem)', lineHeight: 1 }}
          >
            Until then, the brotherhood carries on.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/mentorship"
              className="group inline-flex items-center gap-3 rounded-xs bg-black px-6 py-3.5 text-sm font-medium tracking-wide text-white transition-colors duration-500 hover:bg-primary"
            >
              Join a mentorship circle
              <span aria-hidden className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </Link>
            <Link
              href="/gallery"
              className="inline-flex items-center gap-2 rounded-xs border border-black/15 px-6 py-3.5 text-sm font-medium tracking-wide text-black transition-colors hover:border-black/50"
            >
              Browse past galleries
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
