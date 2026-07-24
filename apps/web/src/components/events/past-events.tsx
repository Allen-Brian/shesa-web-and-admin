'use client';

import Image from 'next/image';
import { motion, type Variants } from 'framer-motion';
import { useMemo, useState } from 'react';

import type { SiteEvent } from './data';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];
const PAGE_SIZE = 4;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, delay: i * 0.06, ease },
  }),
};

// Group past events by calendar year, most recent year first.
function groupByYear(events: readonly SiteEvent[]) {
  const map = new Map<string, SiteEvent[]>();
  for (const e of events) {
    const bucket = map.get(e.year) ?? [];
    bucket.push(e);
    map.set(e.year, bucket);
  }
  return Array.from(map.entries()).sort(([a], [b]) => Number(b) - Number(a));
}

function chunk<T>(arr: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

interface Props {
  readonly past: readonly SiteEvent[];
}

export function PastEvents({ past }: Props) {
  const grouped = groupByYear(past);
  if (past.length === 0) return null;

  return (
    <section className="relative bg-white py-20 text-black md:py-24">
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
              The Archive
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
              The gatherings <span className="italic text-primary">that got us here.</span>
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
            A running record of the reunions, drives, and ceremonies behind us, organised by year,
            four at a time.
          </motion.p>
        </div>

        <div className="mt-14 flex flex-col gap-14 md:mt-16 md:gap-16">
          {grouped.map(([year, list]) => (
            <YearBlock key={year} year={year} events={list} />
          ))}
        </div>
      </div>
    </section>
  );
}

function YearBlock({
  year,
  events,
}: {
  readonly year: string;
  readonly events: readonly SiteEvent[];
}) {
  const pages = useMemo(() => chunk(events, PAGE_SIZE), [events]);
  const [page, setPage] = useState(0);

  const goPrev = () => setPage((p) => (p - 1 + pages.length) % pages.length);
  const goNext = () => setPage((p) => (p + 1) % pages.length);

  const paginated = pages.length > 1;

  return (
    <div className="relative">
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.7, ease }}
        className="mb-6 flex items-baseline gap-4 md:mb-8"
      >
        <span
          className="font-heading font-thin leading-none tracking-tight text-primary"
          style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)' }}
        >
          {year}
        </span>
        <span aria-hidden className="h-px flex-1 origin-left bg-black/12" />
        <span className="font-heading text-xs font-medium uppercase tracking-[0.28em] text-black/50">
          {events.length} {events.length === 1 ? 'event' : 'events'}
        </span>
      </motion.div>

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
          {pages.map((pageEvents, pi) => (
            <ul
              key={pi}
              className="w-full shrink-0 divide-y divide-black/8 pr-2 md:pr-4"
              aria-hidden={pi !== page}
            >
              {pageEvents.map((event, i) => (
                <motion.li
                  key={event.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{
                    duration: 0.55,
                    delay: 0.05 + i * 0.05,
                    ease,
                  }}
                >
                  <PastEventRow event={event} />
                </motion.li>
              ))}
            </ul>
          ))}
        </motion.div>
      </div>

      {paginated && (
        <PaginationBar
          page={page}
          total={pages.length}
          onPrev={goPrev}
          onNext={goNext}
          onSelect={setPage}
        />
      )}
    </div>
  );
}

function PaginationBar({
  page,
  total,
  onPrev,
  onNext,
  onSelect,
}: {
  readonly page: number;
  readonly total: number;
  readonly onPrev: () => void;
  readonly onNext: () => void;
  readonly onSelect: (i: number) => void;
}) {
  return (
    <div className="mt-6 flex items-center justify-between gap-4">
      <button
        type="button"
        onClick={onPrev}
        aria-label="Previous page"
        className="grid h-9 w-9 place-items-center rounded-xs border border-black/15 text-black/70 transition-all duration-300 hover:-translate-x-0.5 hover:border-primary hover:bg-primary hover:text-white"
      >
        <span aria-hidden>←</span>
      </button>

      <div className="flex flex-1 items-center justify-center gap-2">
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
  );
}

function PastEventRow({ event }: { readonly event: SiteEvent }) {
  return (
    <article className="grid grid-cols-[64px_1fr] items-center gap-4 py-5 md:grid-cols-[80px_1fr_auto] md:gap-6 md:py-6">
      <div className="relative aspect-square overflow-hidden rounded-xs md:h-20 md:w-20">
        <Image src={event.image} alt="" fill sizes="80px" quality={75} className="object-cover" />
      </div>

      <div className="min-w-0">
        <p className="font-heading text-[10px] font-medium uppercase tracking-[0.24em] text-primary">
          {event.category} · {event.month} {event.day}, {event.year}
        </p>
        <h3
          className="mt-1.5 font-heading font-light leading-tight text-black"
          style={{ fontSize: '1.05rem', letterSpacing: '-0.005em' }}
        >
          {event.title}
        </h3>
        <p className="mt-1 text-[12.5px] text-black/50">
          {event.location} · {event.city}
        </p>
      </div>

      <div className="col-span-2 md:col-span-1">
        <p className="line-clamp-2 max-w-md text-[13.5px] leading-[1.6] text-black/60 md:text-right">
          {event.description}
        </p>
      </div>
    </article>
  );
}
