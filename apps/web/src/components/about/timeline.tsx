'use client';

import { motion, type Variants } from 'framer-motion';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, delay: i * 0.1, ease },
  }),
};

type Milestone = {
  readonly year: string;
  readonly title: string;
  readonly body: string;
};

// Placeholder milestones, the founding year (1962) is on the record;
// the rest are illustrative and should be verified against SHESA's
// own history before publication.
const milestones: readonly Milestone[] = [
  {
    year: '1962',
    title: 'The College opens.',
    body: 'The Mill Hill Missionaries open the doors of Sacred Heart College on a hillside in Mankon, Bamenda. Twenty boys form the first class.',
  },
  {
    year: '1968',
    title: 'The first Shesans.',
    body: 'The founding cohort graduates and scatters into the world. The seed of what will become an alumni movement is planted.',
  },
  {
    year: '1980s',
    title: 'Chapters take root.',
    body: 'Ex-students in Bamenda, Yaoundé, Douala, and Buea begin meeting informally. Chapter culture is born.',
  },
  {
    year: '1988',
    title: 'SHESA is constituted.',
    body: 'The Sacred Heart Ex-Students Association is formally constituted, with a national executive and a governing charter.',
  },
  {
    year: '2000s',
    title: 'The diaspora chapters.',
    body: 'North America, Europe, and the wider African diaspora form active chapters. SHESA becomes a global network.',
  },
  {
    year: '2016',
    title: 'The scholarship fund.',
    body: 'The alumni scholarship programme launches, aimed at keeping the college accessible to bright students of humble means.',
  },
  {
    year: '2024',
    title: 'The biggest AGM in a decade.',
    body: 'Chapters converge on Bamenda for a landmark AGM. Attendance breaks records; ambitions are set for what comes next.',
  },
  {
    year: '2026',
    title: 'All roads lead to Yaoundé.',
    body: 'The next chapter of the movement, an AGM like no other, at Palais des Congrès, Yaoundé.',
  },
];

export function Timeline() {
  return (
    <section
      className="relative overflow-hidden py-20 text-black md:py-28"
      style={{
        background:
          'linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 3%, white) 0%, color-mix(in srgb, var(--color-primary) 5%, white) 100%)',
      }}
    >
      <div className="mx-auto max-w-350 px-5 md:px-8 lg:px-12">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.6 }}
            variants={fadeUp}
            className="font-heading text-sm font-medium uppercase tracking-[0.28em] text-primary"
          >
            The Road
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
            The road we <span className="italic text-primary">walked.</span>
          </motion.h2>

          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            variants={fadeUp}
            custom={2}
            className="mt-6 max-w-xl text-[15px] leading-[1.7] text-black/60 md:text-base"
          >
            Six decades of chalk on blackboards, hymns at chapel, laughter at reunions. The moments
            that shaped us, in order.
          </motion.p>
        </div>

        <div className="relative mx-auto mt-16 max-w-3xl md:mt-24">
          <span
            aria-hidden
            className="absolute left-[7px] top-0 h-full w-px bg-black/10 md:left-[calc(50%-0.5px)]"
          />

          <ul className="flex flex-col gap-14 md:gap-16">
            {milestones.map((m, i) => {
              const alignRight = i % 2 === 0;
              return (
                <motion.li
                  key={m.year}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.35 }}
                  transition={{ duration: 0.8, delay: 0.1 + i * 0.05, ease }}
                  className="relative pl-10 md:grid md:grid-cols-2 md:gap-10 md:pl-0"
                >
                  <span
                    aria-hidden
                    className="absolute left-0 top-1 grid h-4 w-4 place-items-center rounded-full border-2 border-primary bg-white shadow-[0_0_0_4px_rgba(139,21,51,0.1)] md:left-[calc(50%-0.5rem)]"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  </span>

                  <div
                    className={
                      alignRight
                        ? 'md:col-start-2 md:col-end-3 md:pl-14'
                        : 'md:col-start-1 md:col-end-2 md:pr-14 md:text-right'
                    }
                  >
                    <p className="font-heading text-xs font-medium uppercase tracking-[0.28em] text-primary">
                      {m.year}
                    </p>
                    <h3
                      className="mt-2 font-heading font-thin leading-tight text-black"
                      style={{
                        fontSize: 'clamp(1.25rem, 1.8vw, 1.6rem)',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {m.title}
                    </h3>
                    <p className="mt-2 text-[14.5px] leading-[1.65] text-black/60">{m.body}</p>
                  </div>
                </motion.li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
