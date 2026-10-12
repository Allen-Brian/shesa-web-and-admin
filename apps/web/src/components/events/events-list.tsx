'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import { useMemo, useState } from 'react';
import { CalendarClock } from 'lucide-react';

import { EmptyState } from '@/components/ui/empty-state';
import { MetricsBadge, MetricsProvider } from '@/components/ui/metrics-badge';

import type { SiteEvent } from './events-content';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, delay: i * 0.08, ease },
  }),
};

interface YearGroup {
  readonly year: string;
  readonly events: readonly SiteEvent[];
}

/**
 * Newest first, sliced into years. One ordering rule throughout —
 * latest date first — so an upcoming event sits above a past one
 * without the list changing its mind halfway down.
 */
function groupByYear(events: readonly SiteEvent[]): readonly YearGroup[] {
  const sorted = [...events].sort((a, b) => b.fullDate.localeCompare(a.fullDate));

  const byYear = new Map<string, SiteEvent[]>();
  for (const event of sorted) {
    const bucket = byYear.get(event.year);
    if (bucket) bucket.push(event);
    else byYear.set(event.year, [event]);
  }

  // Map preserves insertion order, and insertion followed the sort.
  return Array.from(byYear, ([year, list]) => ({ year, events: list }));
}

interface Props {
  /** Every event, upcoming and past. Order does not matter. */
  readonly events: readonly SiteEvent[];
  /** Filter chips shown at the top. "All" is always prepended. */
  readonly categories: readonly string[];
}

/**
 * The whole calendar in one list, newest year first, each event linking
 * to its own page whether it has happened or not.
 *
 * Upcoming and past used to be separate sections, which meant the same
 * card design appeared twice under two headings and a visitor had to
 * know which one to look in. They are now one run of years with an
 * "Upcoming" badge marking what is still ahead, so scrolling carries you
 * from the next gathering back through the archive without a seam.
 */
export function EventsList({ events, categories: categoryOptions }: Props) {
  const [filter, setFilter] = useState<string>('All');

  const categories = useMemo<readonly string[]>(
    () => ['All', ...categoryOptions],
    [categoryOptions],
  );

  const list = useMemo(
    () => (filter === 'All' ? events : events.filter((e) => e.categories.includes(filter))),
    [events, filter],
  );

  const years = useMemo(() => groupByYear(list), [list]);

  if (events.length === 0) {
    return (
      <section
        className="relative overflow-hidden py-24 text-black md:py-28"
        style={{
          background:
            'linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 3%, white) 0%, color-mix(in srgb, var(--color-primary) 5%, white) 100%)',
        }}
      >
        <div className="mx-auto max-w-3xl px-5 md:px-8 lg:px-12">
          <EmptyState
            icon={CalendarClock}
            heading="Nothing on the calendar yet"
            body="Reunions, ceremonies, and summits will appear here as soon as they are confirmed."
            cta={{ label: 'Contact us', href: '/contact' }}
          />
        </div>
      </section>
    );
  }

  return (
    <section
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
              The calendar
            </motion.p>

            <motion.h2
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.4 }}
              variants={fadeUp}
              custom={1}
              className="mt-5 font-heading font-thin leading-[1.05] text-black"
              style={{
                fontSize: 'clamp(1.85rem, 3.8vw, 3.5rem)',
                letterSpacing: '-0.02em',
              }}
            >
              Every gathering, <span className="italic text-primary">year by year.</span>
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
            Everything we have held and everything still to come. Filter by the kind of gathering,
            or scroll back through the years.
          </motion.p>
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={fadeUp}
          custom={3}
          className="mt-10 flex flex-wrap items-center gap-2 md:mt-12"
        >
          {categories.map((c) => {
            const active = filter === c;
            const count =
              c === 'All' ? events.length : events.filter((e) => e.categories.includes(c)).length;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setFilter(c)}
                className={`inline-flex items-center gap-2 rounded-xs border px-4 py-2 text-[12.5px] font-medium tracking-wide transition-all ${
                  active
                    ? 'border-primary bg-primary text-white'
                    : 'border-black/12 bg-white text-black/70 hover:border-primary/40 hover:text-primary'
                }`}
              >
                <span>{c}</span>
                <span
                  className={`rounded-xs px-1.5 py-0.5 text-[10px] tabular-nums ${
                    active ? 'bg-white/25 text-white' : 'bg-black/5 text-black/50'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </motion.div>

        <MetricsProvider kind="event" ids={list.map((e) => e.id)}>
          <div className="mt-12 flex flex-col gap-14 md:mt-16 md:gap-20">
            {years.length === 0 ? (
              <p className="rounded-xs border border-dashed border-black/15 bg-white p-10 text-center text-sm text-black/50">
                Nothing in this category yet. Try another filter.
              </p>
            ) : (
              years.map((group) => (
                <section key={group.year} aria-labelledby={`year-${group.year}`}>
                  <YearHeading
                    year={group.year}
                    count={group.events.length}
                    upcoming={group.events.filter((e) => e.upcoming).length}
                  />

                  <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2 md:mt-9 md:gap-6 lg:grid-cols-3">
                    {group.events.map((event, i) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.2 }}
                        transition={{ duration: 0.55, delay: 0.05 + (i % 3) * 0.07, ease }}
                      >
                        <EventCard event={event} />
                      </motion.div>
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        </MetricsProvider>
      </div>
    </section>
  );
}

/** The year that opens each block, with a rule running out from it. */
function YearHeading({
  year,
  count,
  upcoming,
}: {
  readonly year: string;
  readonly count: number;
  readonly upcoming: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ duration: 0.6, ease }}
      className="flex items-baseline gap-5"
    >
      <h3
        id={`year-${year}`}
        className="font-heading font-thin leading-none text-black"
        style={{ fontSize: 'clamp(1.9rem, 4vw, 3rem)', letterSpacing: '-0.03em' }}
      >
        {year}
      </h3>

      {upcoming > 0 && (
        <span className="rounded-xs bg-primary px-2.5 py-1 font-heading text-[10px] font-medium uppercase tracking-[0.22em] text-white">
          Upcoming
        </span>
      )}

      <span aria-hidden className="h-px flex-1 bg-black/12" />

      <span className="shrink-0 font-heading text-[11px] font-medium uppercase tracking-[0.24em] text-black/45">
        {count} {count === 1 ? 'event' : 'events'}
      </span>
    </motion.div>
  );
}

function EventCard({ event }: { readonly event: SiteEvent }) {
  return (
    <Link
      href={`/events/${event.slug}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-xs border border-black/8 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-500 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_18px_40px_-12px_rgba(139,21,51,0.16)]"
    >
      <div className="relative aspect-3/2 overflow-hidden">
        <Image
          src={event.image}
          alt={event.title}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          quality={75}
          className="object-cover object-top transition-transform duration-1000 group-hover:scale-105"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.55) 100%)',
          }}
        />
        <div className="absolute left-4 top-4 flex flex-col items-center rounded-xs bg-white/95 px-3 py-2 text-center shadow-md backdrop-blur-sm">
          <span className="font-heading text-[10px] font-medium uppercase tracking-[0.24em] text-primary">
            {event.month}
          </span>
          <span
            className="font-heading font-light leading-none tracking-tight text-black"
            style={{ fontSize: '1.35rem' }}
          >
            {event.day}
          </span>
          <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-black/50">
            {event.year}
          </span>
        </div>
        {/* Upcoming sits above the category so the two never collide,
            and it is the only thing distinguishing a future gathering
            from the archive now that both live in one list. */}
        <div className="absolute right-4 top-4 flex flex-col items-end gap-1.5">
          {event.upcoming && (
            <span className="rounded-xs bg-primary px-2.5 py-1 font-heading text-[10px] font-medium uppercase tracking-[0.22em] text-white shadow-sm">
              Upcoming
            </span>
          )}
          <span className="rounded-xs bg-black/55 px-2.5 py-1 font-heading text-[10px] font-medium uppercase tracking-[0.22em] text-white backdrop-blur-sm">
            {event.category}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5 md:p-6">
        <h3
          className="font-heading font-light leading-tight text-black transition-colors duration-500 group-hover:text-primary"
          style={{ fontSize: '1.1rem', letterSpacing: '-0.005em' }}
        >
          {event.title}
        </h3>
        <div className="mt-3 flex items-center gap-2 text-[13px] text-black/55">
          <PinIcon />
          <span className="truncate">
            {event.location} · {event.city}
          </span>
        </div>
        <p className="mt-3 line-clamp-3 text-[13.5px] leading-[1.6] text-black/60">
          {event.description}
        </p>
        <MetricsBadge entityId={event.id} className="mt-auto pt-4" />
      </div>
    </Link>
  );
}

function PinIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5 shrink-0 text-primary"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
