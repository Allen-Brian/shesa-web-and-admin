'use client';

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

const virtues = [
  {
    title: 'Courage',
    body: 'To face difficulty without flinching. To speak the truth in every room. To do the hard, right thing.',
  },
  {
    title: 'Integrity',
    body: 'To be the same man in the dark as in daylight. In victory as in loss. In private as in public.',
  },
  {
    title: 'Discipline',
    body: 'To pursue excellence in small things. Because small things are the foundation of great ones.',
  },
] as const;

export function Motto() {
  return (
    <section
      className="relative overflow-hidden py-20 text-black md:py-28"
      style={{
        background:
          'linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 3%, white) 0%, color-mix(in srgb, var(--color-primary) 6%, white) 100%)',
      }}
    >
      <div className="mx-auto max-w-350 px-5 md:px-8 lg:px-12">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.6 }}
            variants={fadeUp}
            className="flex items-center justify-center gap-4"
          >
            <span className="h-px w-14 bg-primary/60 md:w-20" />
            <span
              aria-hidden
              className="block h-2 w-2 rotate-45 bg-primary"
              style={{
                boxShadow: '0 0 12px 2px color-mix(in srgb, var(--color-primary) 60%, transparent)',
              }}
            />
            <span className="h-px w-14 bg-primary/60 md:w-20" />
          </motion.div>

          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.6 }}
            variants={fadeUp}
            custom={1}
            className="mt-6 font-heading text-[11px] font-medium uppercase text-black/70 md:text-xs"
            style={{ letterSpacing: '0.5em' }}
          >
            The Motto
          </motion.p>

          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            custom={2}
            className="mt-8 font-script text-primary"
            style={{
              fontSize: 'clamp(3rem, 9vw, 8rem)',
              lineHeight: 0.95,
              textShadow: '0 6px 40px rgba(139,21,51,0.25)',
            }}
          >
            Viriliter age.
          </motion.h2>

          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            variants={fadeUp}
            custom={3}
            className="mt-4 font-heading font-light tracking-[0.14em] text-black/75 md:text-lg"
            style={{ fontSize: 'clamp(0.95rem, 1.6vw, 1.2rem)' }}
          >
            "ACT WITH COURAGE"
          </motion.p>

          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            variants={fadeUp}
            custom={4}
            className="mt-10 max-w-2xl text-[15.5px] leading-[1.8] text-black/70 md:text-base"
          >
            Two words. A lifelong assignment. Since 1962, every Shesan has walked out of the college
            gates carrying this compass. It calls for bravery in the face of difficulty, honesty in
            every dealing, discipline in every pursuit, and gentleness in every relationship, the
            through-line that connects the boy in the classroom to the man in the boardroom, the
            field, the courtroom, the pulpit.
          </motion.p>
        </div>

        <div className="mt-20 grid gap-10 md:mt-24 md:grid-cols-3 md:gap-14">
          {virtues.map((v, i) => (
            <motion.article
              key={v.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.75, delay: 0.2 + i * 0.12, ease }}
              className="group relative"
            >
              <div className="mb-5 flex items-center gap-3">
                <span className="font-heading text-xs font-medium tracking-[0.3em] text-primary">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="h-px flex-1 bg-black/10 transition-colors duration-500 group-hover:bg-primary/60" />
              </div>
              <h3
                className="font-heading font-thin leading-tight text-black"
                style={{
                  fontSize: 'clamp(1.5rem, 2.4vw, 2rem)',
                  letterSpacing: '-0.01em',
                }}
              >
                {v.title}
              </h3>
              <p className="mt-3 text-[14.5px] leading-[1.7] text-black/60">{v.body}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
