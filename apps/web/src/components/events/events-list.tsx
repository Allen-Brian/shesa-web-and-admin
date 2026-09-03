'use client';

import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { CalendarClock } from 'lucide-react';

import { EmptyState } from '@/components/ui/empty-state';

import type { SiteEvent } from './events-content';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];
const PAGE_SIZE = 9;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, delay: i * 0.08, ease },
  }),
};

function chunk<T>(arr: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

interface Props {
  /** Upcoming events, chronological. Empty → the section short-circuits. */
  readonly upcoming: readonly SiteEvent[];
  /** Filter chips shown at the top. "All" is always prepended. */
  readonly categories: readonly string[];
}

export function EventsList({ upcoming, categories: categoryOptions }: Props) {
  const [filter, setFilter] = useState<string>('All');
  const [page, setPage] = useState(0);

  if (upcoming.length === 0) {
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
            heading="No upcoming events on the calendar"
            body="We are between events at the moment. When the next reunion, ceremony, or summit is confirmed it will show up right here."
            cta={{ label: 'See past events', href: '#past-events' }}
          />
        </div>
      </section>
    );
  }

  const categories = useMemo<readonly string[]>(
    () => ['All', ...categoryOptions],
    [categoryOptions],
  );

  const list = useMemo(
    () => (filter === 'All' ? upcoming : upcoming.filter((e) => e.categories.includes(filter))),
    [upcoming, filter],
  );

  const pages = useMemo(() => chunk(list, PAGE_SIZE), [list]);
  const totalPages = pages.length;

  useEffect(() => {
    setPage(0);
  }, [filter]);

  const goPrev = () => setPage((p) => (totalPages === 0 ? 0 : (p - 1 + totalPages) % totalPages));
  const goNext = () => setPage((p) => (totalPages === 0 ? 0 : (p + 1) % totalPages));

  const paginated = totalPages > 1;

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
              Upcoming
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
              The road <span className="italic text-primary">ahead.</span>
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
            Filter the calendar by the kind of gathering you're looking for.
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
              c === 'All'
                ? upcoming.length
                : upcoming.filter((e) => e.categories.includes(c)).length;
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

        <div className="mt-12 md:mt-16">
          {totalPages === 0 ? (
            <p className="rounded-xs border border-dashed border-black/15 bg-white p-10 text-center text-sm text-black/50">
              Nothing scheduled in this category yet. Check back soon.
            </p>
          ) : (
            <>
              <div className="overflow-hidden">
                <motion.div
                  className="flex touch-pan-y"
                  animate={{ x: `-${page * 100}%` }}
                  transition={{ duration: 0.7, ease }}
                  drag={paginated ? 'x' : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.15}
                  onDragEnd={(_, info) => {
                    if (!paginated) return;
                    const threshold = 60;
                    if (info.offset.x < -threshold) goNext();
                    else if (info.offset.x > threshold) goPrev();
                  }}
                >
                  <AnimatePresence>
                    {pages.map((pageEvents, pi) => (
                      <div
                        key={pi}
                        className="grid w-full shrink-0 grid-cols-1 gap-5 pr-2 sm:grid-cols-2 md:gap-6 md:pr-4 lg:grid-cols-3"
                        aria-hidden={pi !== page}
                      >
                        {pageEvents.map((event, i) => (
                          <motion.div
                            key={event.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{
                              duration: 0.55,
                              delay: 0.05 + (i % 9) * 0.05,
                              ease,
                            }}
                          >
                            <EventCard event={event} />
                          </motion.div>
                        ))}
                      </div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              </div>

              {paginated && (
                <PaginationBar
                  page={page}
                  total={totalPages}
                  onPrev={goPrev}
                  onNext={goNext}
                  onSelect={setPage}
                  label={`Showing ${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, list.length)} of ${list.length}`}
                />
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function PaginationBar({
  page,
  total,
  onPrev,
  onNext,
  onSelect,
  label,
}: {
  readonly page: number;
  readonly total: number;
  readonly onPrev: () => void;
  readonly onNext: () => void;
  readonly onSelect: (i: number) => void;
  readonly label: string;
}) {
  return (
    <div className="mt-8 flex flex-col items-center gap-4 md:mt-10 md:flex-row md:justify-between md:gap-6">
      <p className="font-heading text-[11px] font-medium uppercase tracking-[0.28em] text-black/50">
        {label}
      </p>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onPrev}
          aria-label="Previous page"
          className="grid h-9 w-9 place-items-center rounded-xs border border-black/15 text-black/70 transition-all duration-300 hover:-translate-x-0.5 hover:border-primary hover:bg-primary hover:text-white"
        >
          <span aria-hidden>←</span>
        </button>

        <div className="flex items-center gap-2">
          {Array.from({ length: total }).map((_, i) => {
            const active = i === page;
            return (
              <button
                key={i}
                type="button"
                onClick={() => onSelect(i)}
                aria-label={`Show page ${i + 1}`}
                aria-current={active}
                className={`h-1 rounded-full transition-all duration-500 ${
                  active ? 'w-12 bg-primary' : 'w-6 bg-black/15 hover:bg-black/30'
                }`}
              />
            );
          })}
        </div>

        <button
          type="button"
          onClick={onNext}
          aria-label="Next page"
          className="grid h-9 w-9 place-items-center rounded-xs border border-black/15 text-black/70 transition-all duration-300 hover:translate-x-0.5 hover:border-primary hover:bg-primary hover:text-white"
        >
          <span aria-hidden>→</span>
        </button>
      </div>
    </div>
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
          className="object-cover transition-transform duration-1000 group-hover:scale-105"
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
        <span className="absolute right-4 top-4 rounded-xs bg-black/55 px-2.5 py-1 font-heading text-[10px] font-medium uppercase tracking-[0.22em] text-white backdrop-blur-sm">
          {event.category}
        </span>
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
