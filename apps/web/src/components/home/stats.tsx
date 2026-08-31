'use client';

import { motion, useInView, type Variants } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.1, ease },
  }),
};

type Stat = {
  readonly target: number;
  readonly suffix: string;
  readonly label: string;
  readonly caption: string;
  readonly icon: ReactNode;
};

const stats: readonly Stat[] = [
  {
    target: 30,
    suffix: 'K+',
    label: 'Alumni Worldwide',
    caption: 'Graduates connected across every generation.',
    icon: <UsersIcon />,
  },
  {
    target: 12,
    suffix: '',
    label: 'Governing Organs',
    caption: 'Working bodies that keep the movement steady.',
    icon: <OrgansIcon />,
  },
  {
    target: 45,
    suffix: '+',
    label: 'Countries',
    caption: 'A brotherhood with no borders, literally.',
    icon: <GlobeIcon />,
  },
  {
    target: 200,
    suffix: '+',
    label: 'Active Chapters',
    caption: 'Local hubs organising life on the ground.',
    icon: <PinIcon />,
  },
];

function CountUp({
  target,
  active,
  duration = 1600,
}: {
  readonly target: number;
  readonly active: boolean;
  readonly duration?: number;
}) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.floor(eased * target));
      if (t < 1) raf = requestAnimationFrame(tick);
      else setValue(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration]);

  return <>{value.toLocaleString()}</>;
}

export function Stats() {
  const gridRef = useRef<HTMLDivElement>(null);
  const inView = useInView(gridRef, { once: true, amount: 0.3 });

  return (
    <section
      className="relative overflow-hidden py-20 text-black md:py-24 bg-black/5"
      // style={{
      //   background:
      //     'linear-gradient(180deg, color-mix(in srgb, var(--color-muted) 3%, white) 0%, color-mix(in srgb, var(--color-muted) 6%, white) 100%)',
      // }}
    >
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
              By The Numbers
            </motion.p>

            <motion.h2
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.4 }}
              variants={fadeUp}
              className="mt-5 font-heading font-thin leading-[1.05] text-black"
              style={{
                fontSize: 'clamp(1.85rem, 3.8vw, 3.5rem)',
                letterSpacing: '-0.02em',
              }}
            >
              Unleashing <span className="italic text-primary">our Potential.</span>
            </motion.h2>
          </div>

          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            variants={fadeUp}
            className="max-w-md text-[15px] leading-[1.7] text-black/60 md:col-span-5"
          >
            A brotherhood spanning continents, generations, and disciplines, organised into working
            organs, active chapters, and countless unwritten friendships.
          </motion.p>
        </div>

        <div
          ref={gridRef}
          className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 md:mt-20 md:gap-6 lg:grid-cols-4"
        >
          {stats.map((s, i) => (
            <motion.article
              key={s.label}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.7, delay: 0.1 + i * 0.08, ease }}
              className="group relative overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_18px_40px_-12px_rgba(139,21,51,0.18)] md:p-7"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-primary transition-transform duration-500 group-hover:scale-x-100"
              />

              {/* <div
                className="inline-flex rounded-xl transition-colors duration-500 group-hover:bg-primary group-hover:text-white"
                style={{
                  color: 'var(--color-primary)',
                }}
              >
                {s.icon}
              </div> */}

              <div className="mt-6 flex items-baseline gap-1 leading-none tracking-tight">
                <span
                  className="font-heading font-medium text-black"
                  style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)' }}
                >
                  <CountUp target={s.target} active={inView} />
                </span>
                {s.suffix && (
                  <span
                    className="font-heading font-medium text-primary"
                    style={{ fontSize: 'clamp(1.5rem, 2.6vw, 2.25rem)' }}
                  >
                    {s.suffix}
                  </span>
                )}
              </div>

              <p className="mt-3 font-heading text-xs font-semibold uppercase tracking-[0.22em] text-black">
                {s.label}
              </p>
              <p className="mt-2 text-[13.5px] leading-[1.55] text-black/55">{s.caption}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

function UsersIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function OrgansIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden
    >
      <rect x="4" y="10" width="4" height="10" rx="1" />
      <rect x="10" y="4" width="4" height="16" rx="1" />
      <rect x="16" y="7" width="4" height="13" rx="1" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
