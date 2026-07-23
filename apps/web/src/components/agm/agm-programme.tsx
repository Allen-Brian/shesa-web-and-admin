'use client';

import { motion, type Variants } from 'framer-motion';

import { AGM_SCHEDULE } from './data';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.85, delay: i * 0.08, ease },
  }),
};

/**
 * Programme — vertical chapter-per-day timeline. Each day is a full-
 * width block; sessions run down a shared left rail so a dense
 * Assembly Day doesn't fight for horizontal space with the shorter
 * Friday + Sunday blocks. The day header carries a chapter numeral,
 * a short focus-line, and the human date so operators scanning for
 * "where do I need to be Saturday morning?" find it in one glance.
 */
export function AgmProgramme() {
  return (
    <section
      id="programme"
      className="relative overflow-hidden py-20 text-black md:py-24"
      style={{
        background:
          'linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 3%, white) 0%, color-mix(in srgb, var(--color-primary) 6%, white) 100%)',
      }}
    >
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
              The Programme
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
              Three chapters. <span className="italic text-primary">One weekend.</span>
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
            The full three-day agenda. Times are local (WAT); the printed brochure is the source of
            truth on the day.
          </motion.p>
        </div>

        <div className="mt-16 flex flex-col gap-14 md:gap-16">
          {AGM_SCHEDULE.map((day, dayIdx) => (
            <ProgrammeDay
              key={day.day}
              index={dayIdx}
              day={day.day}
              date={day.date}
              sessions={day.sessions}
              focus={DAY_FOCUS[dayIdx] ?? ''}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

const DAY_FOCUS: readonly string[] = [
  'Tournament + batch meetings',
  'Ceremony · AGM · gala night',
  'Thanksgiving mass',
];

interface ProgrammeDayProps {
  readonly index: number;
  readonly day: string;
  readonly date: string;
  readonly sessions: readonly {
    readonly time: string;
    readonly title: string;
    readonly detail: string;
  }[];
  readonly focus: string;
}

function ProgrammeDay({ index, day, date, sessions, focus }: ProgrammeDayProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.8, delay: index * 0.08, ease }}
      className="relative"
    >
      <header className="grid gap-4 border-b border-black/10 pb-6 md:grid-cols-12 md:items-baseline md:gap-6">
        <div className="md:col-span-3">
          <p className="font-heading text-[11px] font-medium uppercase tracking-[0.28em] text-primary">
            Chapter {toRoman(index + 1)}
          </p>
          <h3
            className="mt-2 font-heading font-thin leading-[1.05] text-black"
            style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', letterSpacing: '-0.02em' }}
          >
            {day}
          </h3>
        </div>
        <div className="flex flex-col gap-1 md:col-span-6">
          <p className="text-[13px] uppercase tracking-[0.18em] text-black/55">{date}</p>
          {focus && (
            <p className="font-script text-primary" style={{ fontSize: '1.5rem', lineHeight: 1 }}>
              {focus}
            </p>
          )}
        </div>
        <div className="md:col-span-3 md:text-right">
          <p className="text-[11px] uppercase tracking-[0.2em] text-black/40">
            {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}
          </p>
        </div>
      </header>

      <ol className="relative mt-8 flex flex-col gap-5 md:pl-6">
        <span
          aria-hidden
          className="pointer-events-none absolute left-2.25 top-1 hidden h-[calc(100%-0.5rem)] w-px bg-black/10 md:block"
        />
        {sessions.map((s, i) => (
          <motion.li
            key={`${day}-${i}`}
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.55, delay: i * 0.03, ease }}
            className="relative grid grid-cols-[72px_1fr] items-baseline gap-4 md:grid-cols-[80px_1fr]"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -left-6 top-2 hidden h-1.5 w-1.5 rounded-full bg-primary md:block"
            />
            <span className="font-heading text-[13px] font-medium tabular-nums text-primary">
              {s.time}
            </span>
            <div>
              <p className="font-heading text-[15px] font-light leading-tight text-black">
                {s.title}
              </p>
              {s.detail && (
                <p className="mt-1 text-[13px] leading-[1.6] text-black/60">{s.detail}</p>
              )}
            </div>
          </motion.li>
        ))}
      </ol>
    </motion.article>
  );
}

function toRoman(n: number): string {
  const map: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V' };
  return map[n] ?? String(n);
}
