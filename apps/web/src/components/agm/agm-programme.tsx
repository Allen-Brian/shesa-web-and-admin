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

export function AgmProgramme() {
  return (
    <section
      id="programme"
      className="relative overflow-hidden py-20 text-black md:py-24"
      style={{
        background:
          'linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 3%, white) 0%, color-mix(in srgb, var(--color-primary) 5%, white) 100%)',
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
              Every session, <span className="italic text-primary">every moment.</span>
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

        <div className="mt-14 grid gap-6 md:grid-cols-3 md:gap-8">
          {AGM_SCHEDULE.map((day, dayIdx) => (
            <motion.div
              key={day.day}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.8, delay: dayIdx * 0.1, ease }}
              className="relative flex flex-col overflow-hidden rounded-xs border border-black/10 bg-white p-6 md:p-8"
            >
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-1 bg-primary"
                style={{ opacity: 0.85 }}
              />
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-heading text-[11px] font-medium uppercase tracking-[0.28em] text-primary">
                  Day {dayIdx + 1}
                </p>
                <p className="text-[11px] uppercase tracking-[0.2em] text-black/45">{day.date}</p>
              </div>
              <h3
                className="mt-4 font-heading text-2xl font-thin text-black"
                style={{ letterSpacing: '-0.015em' }}
              >
                {day.day}
              </h3>

              <ol className="mt-6 flex flex-col gap-4 border-t border-black/8 pt-6">
                {day.sessions.map((s, i) => (
                  <li key={`${day.day}-${i}`} className="grid grid-cols-[64px_1fr] gap-4">
                    <span className="font-heading text-[13px] font-medium tabular-nums text-primary">
                      {s.time}
                    </span>
                    <span>
                      <p className="font-heading text-[14px] font-light text-black leading-tight">
                        {s.title}
                      </p>
                      <p className="mt-1 text-[12px] leading-[1.55] text-black/55">{s.detail}</p>
                    </span>
                  </li>
                ))}
              </ol>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
