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

const pillars = [
  {
    title: 'Reconnect',
    body: 'Chapter meetings, class reunions, homecomings, the mechanics of keeping the brotherhood alive.',
  },
  {
    title: 'Celebrate',
    body: 'Weddings, ordinations, promotions, book launches, showing up for each other, always.',
  },
  {
    title: 'Serve',
    body: 'Scholarships, infrastructure, healthcare, pouring back into the school and the wider community.',
  },
  {
    title: 'Steward',
    body: 'Guarding the ethos of the college and preparing the ground for the generations still to come.',
  },
] as const;

export function Association() {
  return (
    <section className="relative overflow-hidden bg-white py-20 text-black md:py-28">
      <div className="mx-auto max-w-350 px-5 md:px-8 lg:px-12">
        <div className="grid gap-10 md:grid-cols-12 md:items-end md:gap-14">
          <div className="md:col-span-7">
            <motion.p
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.6 }}
              variants={fadeUp}
              className="font-heading text-sm font-medium uppercase tracking-[0.28em] text-primary"
            >
              The Association
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
              A movement in <span className="italic text-primary">three letters.</span>
            </motion.h2>
          </div>

          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            variants={fadeUp}
            custom={2}
            className="max-w-md text-[15px] leading-[1.7] text-black/60 md:col-span-5"
          >
            The Sacred Heart Ex-Students' Association, SHESA, is what happens when a school produces
            enough men who refuse to forget each other.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.85, delay: 0.3, ease }}
          className="mt-14 grid gap-8 md:mt-16 md:grid-cols-12 md:gap-14"
        >
          <div className="md:col-span-7">
            <p className="text-[15.5px] leading-[1.8] text-black/70 md:text-base">
              Constituted formally as an alumni body, SHESA is the living network of every man who
              has walked through the college gates, from the founding class of the sixties to the
              leavers of last term. We count our members in the tens of thousands, our chapters in
              the hundreds, and our countries in the dozens.
            </p>
            <p className="mt-4 text-[15.5px] leading-[1.8] text-black/70 md:text-base">
              We are organised into governing organs at national and regional level, coordinated by
              an elected executive and served by working committees. But the real work is not the
              governance, it is the four things we do relentlessly, in that order.
            </p>
          </div>

          <div className="md:col-span-5">
            <div className="relative overflow-hidden rounded-xs border border-black/10 bg-white p-6 md:p-8">
              <p className="font-heading text-[10px] font-medium uppercase tracking-[0.28em] text-primary">
                The Charter
              </p>
              <p
                className="mt-3 font-heading font-thin leading-tight text-black"
                style={{
                  fontSize: 'clamp(1.35rem, 2vw, 1.85rem)',
                  letterSpacing: '-0.01em',
                }}
              >
                To reconnect, celebrate, serve, and steward, for as long as there are Shesans, and
                for those who come after.
              </p>
              <div aria-hidden className="mt-6 flex items-center gap-3">
                <span className="h-px w-8 bg-primary" />
                <span className="font-heading text-xs font-medium tracking-[0.24em] text-black/60">
                  Est. by the alumni
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="mt-16 grid gap-10 md:mt-20 md:grid-cols-4 md:gap-10">
          {pillars.map((p, i) => (
            <motion.article
              key={p.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.75, delay: 0.15 + i * 0.08, ease }}
              className="group relative"
            >
              <div className="mb-5 flex items-center gap-3">
                <span className="font-heading text-xs font-medium tracking-[0.3em] text-primary">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="h-px flex-1 bg-black/10 transition-colors duration-500 group-hover:bg-primary/60" />
              </div>
              <h3
                className="font-heading font-light leading-tight text-black"
                style={{ fontSize: 'clamp(1.25rem, 1.8vw, 1.6rem)' }}
              >
                {p.title}
              </h3>
              <p className="mt-2 text-[14px] leading-[1.65] text-black/60">{p.body}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
