'use client';

import { motion, type Variants } from 'framer-motion';

import { AGM_SCHEDULE } from './agm-content';

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
 * Programme, three compact day cards laid out side-by-side. Sessions
 * inside each card render as a tight time+title list; long detail
 * lines truncate on hover so the card height stays bounded even for
 * dense days. Same visual density as the original design, but with a
 * primary top-bar on each card and slightly tighter session spacing
 * so Assembly Day fits without stretching.
 */
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

        <div className="mt-12 grid gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
          {AGM_SCHEDULE.map((day, dayIdx) => {
            const parts = day.day.split('·').map((s) => s.trim());
            const dayName = parts[0] ?? day.day;
            const dateParts = day.date.split('·').map((s) => s.trim());
            const chapter = parts[1] ?? dateParts[1] ?? dayName;
            return (
              <motion.article
                key={day.day}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.8, delay: dayIdx * 0.08, ease }}
                className="relative flex flex-col overflow-hidden rounded-xs border border-black/10 bg-white p-5 md:p-6"
              >
                <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-primary/80" />
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-heading text-[10px] font-medium uppercase tracking-[0.24em] text-primary">
                    {chapter}
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-black/45">
                    {(day.date.split('·')[0] ?? '').trim()}
                  </p>
                </div>
                <h3
                  className="mt-2 font-heading text-xl font-thin text-black"
                  style={{ letterSpacing: '-0.015em' }}
                >
                  {dayName}
                </h3>
                {day.date.includes('·') && (
                  <p className="mt-1 text-[11px] leading-[1.45] text-black/50">
                    {day.date.split('·').slice(1).join('·').trim()}
                  </p>
                )}

                <ol className="mt-4 flex flex-col gap-2 border-t border-black/8 pt-3">
                  {day.sessions.map((s, i) => (
                    <li
                      key={`${day.day}-${i}`}
                      className="grid grid-cols-[52px_1fr] items-baseline gap-3 py-0.5"
                    >
                      <span className="font-heading text-[11px] font-medium tabular-nums text-primary">
                        {s.time}
                      </span>
                      <span className="min-w-0">
                        <p className="font-heading text-[12.5px] font-light leading-tight text-black">
                          {s.title}
                        </p>
                        {s.detail && (
                          <p className="mt-0.5 line-clamp-2 text-[10.5px] leading-[1.4] text-black/55">
                            {s.detail}
                          </p>
                        )}
                      </span>
                    </li>
                  ))}
                </ol>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
