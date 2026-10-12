'use client';

import Link from 'next/link';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

// AGM 2026, Assembly Day is Saturday 14 November 2026 at Palais des
// Congrès, Yaoundé. Countdown anchors to the start of that day in
// Yaoundé local time (WAT, UTC+1). Friday 13 hosts the regional
// football tournament + batch meetings; Sunday 15 closes with the
// thanksgiving mass.
const AGM_TARGET = new Date('2026-11-14T00:00:00+01:00');

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.85, delay: i * 0.1, ease },
  }),
};

const revealParent: Variants = {
  hidden: {},
  visible: (delay: number = 0) => ({
    transition: { delayChildren: delay, staggerChildren: 0.14 },
  }),
};

const revealLine: Variants = {
  hidden: { y: '110%' },
  visible: { y: 0, transition: { duration: 1, ease } },
};

type Highlight = {
  readonly numeral: string;
  readonly title: string;
  readonly body: string;
  readonly icon: ReactNode;
};

const highlights: readonly Highlight[] = [
  {
    numeral: 'I',
    title: 'Regional Tournament',
    body: 'Friday. Grassfield vs Coastal, Centre vs Northern. 1,000,000 XAF prize.',
    icon: <ReunionIcon />,
  },
  {
    numeral: 'II',
    title: 'Grand Opening',
    body: 'Saturday morning. Mass, march past, keynote from H.E. Paul Tasong.',
    icon: <VisionIcon />,
  },
  {
    numeral: 'III',
    title: 'General Assembly',
    body: 'Saturday afternoon. Reports, budget, projects, resolutions, constitution.',
    icon: <AwardIcon />,
  },
  {
    numeral: 'IV',
    title: 'Gala & Awards Night',
    body: 'Saturday evening. Dinner, cultural competitions, awards, and the dance floor.',
    icon: <NightIcon />,
  },
];

type Countdown = {
  readonly weeks: number;
  readonly days: number;
  readonly hours: number;
  readonly minutes: number;
};

function useCountdown(target: Date): Countdown | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (now === null) return null;

  const diff = Math.max(0, target.getTime() - now);
  const totalMinutes = Math.floor(diff / 60_000);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);

  return {
    weeks: Math.floor(totalDays / 7),
    days: totalDays % 7,
    hours: totalHours % 24,
    minutes: totalMinutes % 60,
  };
}

function saveToCalendar() {
  if (typeof window === 'undefined') return;

  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');

  // Anchored to Yaoundé local time (WAT, UTC+1). Friday tournament
  // kick-off through Sunday's thanksgiving mass, a single calendar
  // block so add-to-calendar reserves the whole weekend.
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SHESA Alumni//AGM 2026//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    'UID:agm-2026@shesaconnect.com',
    `DTSTAMP:${stamp}`,
    'DTSTART;TZID=Africa/Douala:20261113T150000',
    'DTEND;TZID=Africa/Douala:20261115T130000',
    'SUMMARY:SHESA AGM 2026, Yaoundé',
    'LOCATION:Palais des Congrès\\, Yaoundé\\, Cameroon',
    'DESCRIPTION:Fri 13 Nov, Regional football tournament + batch meetings. Sat 14 Nov, Assembly Day at Palais des Congrès (opening ceremony\\, AGM\\, gala night). Sun 15 Nov, Thanksgiving mass. https://shesaconnect.com/agm-2026',
    'URL:https://shesaconnect.com/agm-2026',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'shesa-agm-2026.ics';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function AgmCta() {
  const countdown = useCountdown(AGM_TARGET);

  const cards = countdown
    ? [
        { key: 'weeks', value: countdown.weeks, label: 'Weeks' },
        { key: 'days', value: countdown.days, label: 'Days' },
        { key: 'hours', value: countdown.hours, label: 'Hours' },
        { key: 'minutes', value: countdown.minutes, label: 'Minutes' },
      ]
    : [];
  const visibleCards = (() => {
    const out: typeof cards = [];
    let started = false;
    for (const c of cards) {
      if (started || c.value > 0) {
        started = true;
        out.push(c);
      }
    }
    if (out.length === 0 && countdown) {
      return [{ key: 'minutes', value: countdown.minutes, label: 'Minutes' }];
    }
    return out;
  })();

  return (
    <section
      data-nav-dark
      className="relative isolate overflow-hidden bg-black py-28 text-white md:py-36"
    >
      <InvitationBackdrop />

      <div className="relative mx-auto max-w-5xl px-6">
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.6 }}
            variants={fadeUp}
            className="flex items-center justify-center gap-4"
          >
            <span className="h-px w-16 bg-primary/60 md:w-24" />
            <span
              aria-hidden
              className="block h-2 w-2 rotate-45 bg-primary"
              style={{
                boxShadow: '0 0 14px 2px color-mix(in srgb, var(--color-primary) 60%, transparent)',
              }}
            />
            <span className="h-px w-16 bg-primary/60 md:w-24" />
          </motion.div>

          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.6 }}
            variants={fadeUp}
            custom={1}
            className="mt-6 font-heading text-[11px] font-medium uppercase text-white/70 md:text-xs"
            style={{ letterSpacing: '0.5em' }}
          >
            Save the Date
          </motion.p>

          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            variants={revealParent}
            custom={0.2}
            className="mt-10 font-heading font-thin leading-[1.05] text-white"
            style={{
              fontSize: 'clamp(1.85rem, 4vw, 3.5rem)',
              letterSpacing: '-0.01em',
            }}
          >
            <span className="block overflow-hidden pb-1 md:pb-2">
              <motion.span variants={revealLine} className="block">
                All roads lead to
              </motion.span>
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 1, delay: 0.55, ease }}
            className="mt-3 font-script text-primary md:mt-5"
            style={{
              fontSize: 'clamp(2.75rem, 7vw, 6rem)',
              lineHeight: 1,
              textShadow: '0 6px 40px rgba(139,21,51,0.55)',
            }}
          >
            Palais des Congrès, Yaoundé.
          </motion.p>

          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            variants={fadeUp}
            custom={7}
            className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-white/70 md:text-base"
          >
            <span className="font-heading font-medium tracking-[0.14em] text-white">
              13 - 15 · 11 · 2026
            </span>
            <span className="h-1 w-1 rounded-full bg-white/40" />
            <span className="font-heading font-light tracking-[0.14em]">Yaoundé · Cameroon</span>
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.9, delay: 0.7, ease }}
            className="mt-14 w-full md:mt-16"
          >
            <div
              className={`mx-auto grid gap-3 md:gap-5 ${
                visibleCards.length === 4
                  ? 'max-w-4xl grid-cols-2 md:grid-cols-4'
                  : visibleCards.length === 3
                    ? 'max-w-3xl grid-cols-3'
                    : visibleCards.length === 2
                      ? 'max-w-md grid-cols-2'
                      : 'max-w-xs grid-cols-1'
              }`}
              aria-label="Time remaining until AGM 2026 begins"
            >
              <AnimatePresence mode="popLayout">
                {visibleCards.map((card, i) => (
                  <CountdownCard
                    key={card.key}
                    value={card.value}
                    label={card.label}
                    delay={0.8 + i * 0.08}
                  />
                ))}
              </AnimatePresence>
            </div>
          </motion.div>

          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            variants={fadeUp}
            custom={11}
            className="mt-12 font-script text-white/85 md:mt-14"
            style={{ fontSize: 'clamp(1.5rem, 2.4vw, 2.25rem)', lineHeight: 1 }}
          >
            An AGM like never before.
          </motion.p>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            variants={fadeUp}
            custom={12}
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:gap-5"
          >
            <SupportButton />
            <SaveToCalendarButton />
          </motion.div>
        </div>

        <Highlights />
      </div>
    </section>
  );
}

function Highlights() {
  return (
    <div className="mt-28 md:mt-36">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.5 }}
        variants={fadeUp}
        className="flex items-center justify-center gap-3"
      >
        <span className="h-px w-8 bg-white/25 md:w-12" />
        <p
          className="font-heading text-[11px] font-medium uppercase text-white/60 md:text-xs"
          style={{ letterSpacing: '0.5em' }}
        >
          What Awaits
        </p>
        <span className="h-px w-8 bg-white/25 md:w-12" />
      </motion.div>

      <motion.h3
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.5 }}
        variants={fadeUp}
        custom={1}
        className="mx-auto mt-6 max-w-2xl text-center font-heading font-thin leading-[1.15] text-white"
        style={{ fontSize: 'clamp(1.5rem, 3vw, 2.5rem)', letterSpacing: '-0.01em' }}
      >
        Three days. One brotherhood. <span className="italic text-primary">Unforgettable.</span>
      </motion.h3>

      <div className="mt-14 grid gap-10 md:grid-cols-2 md:gap-12 lg:grid-cols-4 lg:gap-8">
        {highlights.map((h, i) => (
          <motion.article
            key={h.numeral}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.7, delay: 0.1 + i * 0.1, ease }}
            className="group relative"
          >
            <div className="flex items-start justify-between gap-3">
              <span
                className="font-heading font-thin leading-none text-primary"
                style={{ fontSize: 'clamp(2.5rem, 3.5vw, 3.5rem)', letterSpacing: '-0.02em' }}
              >
                {h.numeral}
              </span>
              <span
                aria-hidden
                className="mt-2 grid h-8 w-8 place-items-center rounded-xs border border-white/15 text-white/70 transition-all duration-500 group-hover:border-primary/60 group-hover:text-primary"
              >
                {h.icon}
              </span>
            </div>
            <div
              className="mt-5 h-px w-full origin-left scale-x-100 bg-white/12 transition-colors duration-500 group-hover:bg-primary/60"
              aria-hidden
            />
            <h4
              className="mt-5 font-heading font-light leading-tight text-white"
              style={{ fontSize: 'clamp(1.25rem, 1.6vw, 1.5rem)', letterSpacing: '-0.01em' }}
            >
              {h.title}
            </h4>
            <p className="mt-2 text-[13.5px] leading-[1.65] text-white/60">{h.body}</p>
          </motion.article>
        ))}
      </div>
    </div>
  );
}

function SupportButton() {
  return (
    <div className="relative rounded-xs">
      <span className="border-beam-halo" aria-hidden />
      <Link
        href="/agm-2026"
        className="group relative inline-flex items-center gap-3 overflow-hidden rounded-xs bg-primary px-10 py-5 text-sm font-medium tracking-wide text-primary-foreground shadow-[0_20px_60px_-15px_rgba(139,21,51,0.6)] transition-transform duration-500 hover:-translate-y-0.5 md:px-12 md:py-5 md:text-base"
      >
        <span className="border-beam" aria-hidden />
        <span
          aria-hidden
          className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/35 to-transparent transition-transform duration-1000 group-hover:translate-x-full"
        />
        <span className="relative">Support The Movement</span>
        <span
          aria-hidden
          className="relative grid h-7 w-7 place-items-center rounded-xs bg-white/20 transition-transform duration-500 group-hover:translate-x-1"
        >
          →
        </span>
      </Link>
    </div>
  );
}

function SaveToCalendarButton() {
  return (
    <button
      type="button"
      onClick={saveToCalendar}
      className="group relative inline-flex items-center gap-3 overflow-hidden rounded-xs border border-white/25 bg-white/3 px-10 py-5 text-sm font-medium tracking-wide text-white backdrop-blur-sm transition-all duration-500 hover:-translate-y-0.5 hover:border-white hover:bg-white hover:text-black md:px-12 md:py-5 md:text-base"
    >
      <svg
        viewBox="0 0 24 24"
        className="relative h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <rect x="3" y="4" width="18" height="18" rx="1.5" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
      <span className="relative">Save to Calendar</span>
    </button>
  );
}

function CountdownCard({
  value,
  label,
  delay,
}: {
  readonly value: number;
  readonly label: string;
  readonly delay: number;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, rotateX: -15 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      exit={{ opacity: 0, y: -12, rotateX: 15 }}
      transition={{ duration: 0.7, delay, ease }}
      className="group relative overflow-hidden rounded-xs border border-white/10 bg-white/4 p-5 backdrop-blur-sm transition-colors duration-500 hover:border-primary/60 md:p-8"
      style={{ transformStyle: 'preserve-3d' }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-xs opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(80% 60% at 50% 0%, color-mix(in srgb, var(--color-primary) 20%, transparent), transparent 70%)',
        }}
      />
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-primary) 80%, transparent), transparent)',
        }}
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear', delay }}
      />
      <div className="relative">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={value}
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            transition={{ duration: 0.5, ease }}
            className="font-heading font-medium leading-none tracking-tight tabular-nums text-white"
            style={{
              fontSize: 'clamp(2.25rem, 4.4vw, 3.75rem)',
              textShadow: '0 4px 30px rgba(139,21,51,0.35)',
            }}
          >
            {value.toString().padStart(2, '0')}
          </motion.div>
        </AnimatePresence>
        <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.28em] text-white/60 md:text-xs">
          {label}
        </p>
      </div>
    </motion.div>
  );
}

function InvitationBackdrop() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(55% 65% at 50% 40%, color-mix(in srgb, var(--color-primary) 18%, transparent) 0%, transparent 70%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: 'radial-gradient(80% 90% at 50% 50%, transparent 55%, rgba(0,0,0,0.75) 100%)',
        }}
      />
      <FloatingMotes />
      <GrainOverlay />
      <TopEdgeGlow />
      <BottomEdgeGlow />
    </>
  );
}

function FloatingMotes() {
  const motes = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, i) => ({
        id: i,
        left: `${(i * 91.7) % 100}%`,
        size: 1 + ((i * 3) % 3),
        duration: 18 + ((i * 5) % 14),
        delay: (i * 2.2) % 14,
        drift: (i % 2 === 0 ? 1 : -1) * (12 + ((i * 3) % 18)),
      })),
    [],
  );

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {motes.map((m) => (
        <motion.span
          key={m.id}
          className="absolute bottom-0 block rounded-full"
          style={{
            left: m.left,
            width: m.size,
            height: m.size,
            background: 'color-mix(in srgb, var(--color-primary) 60%, white)',
            boxShadow: '0 0 6px 1px color-mix(in srgb, var(--color-primary) 40%, transparent)',
          }}
          animate={{
            y: ['0%', '-120vh'],
            x: [0, m.drift, 0],
            opacity: [0, 0.85, 0],
          }}
          transition={{
            duration: m.duration,
            delay: m.delay,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}

function GrainOverlay() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 opacity-[0.22] mix-blend-overlay"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.3 0'/></filter><rect width='200' height='200' filter='url(%23n)'/></svg>\")",
        backgroundSize: '200px 200px',
      }}
    />
  );
}

function TopEdgeGlow() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/25 to-transparent"
    />
  );
}

function BottomEdgeGlow() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-primary/40 to-transparent"
    />
  );
}

function ReunionIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="8" r="2.5" />
      <path d="M4 20v-1a5 5 0 0 1 5-5h0a5 5 0 0 1 5 5v1" />
      <path d="M14 20v-1a4 4 0 0 1 4-4h1" />
    </svg>
  );
}

function AwardIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="9" r="6" />
      <path d="M8.5 14 6 22l6-3 6 3-2.5-8" />
    </svg>
  );
}

function VisionIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18M3 12h18" />
    </svg>
  );
}

function NightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
