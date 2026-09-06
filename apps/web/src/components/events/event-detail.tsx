'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import { useEffect, useState } from 'react';

import { Engagement } from '@/components/ui/engagement';

import type { SiteEvent } from './events-content';

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
  visible: { transition: { delayChildren: 0.25, staggerChildren: 0.15 } },
};

const revealLine: Variants = {
  hidden: { y: '110%' },
  visible: { y: 0, transition: { duration: 1, ease } },
};

function toIcs(event: SiteEvent) {
  const [y, m, d] = event.fullDate.split('-');
  const start = `${y}${m}${d}T090000`;
  const end = `${y}${m}${d}T170000`;
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SHESA Alumni//Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.slug}@shesaconnect.com`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${event.title}`,
    `LOCATION:${event.location}\\, ${event.city}`,
    `DESCRIPTION:${event.description} https://shesaconnect.com/events/${event.slug}`,
    `URL:https://shesaconnect.com/events/${event.slug}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

function saveToCalendar(event: SiteEvent) {
  if (typeof window === 'undefined') return;
  const blob = new Blob([toIcs(event)], {
    type: 'text/calendar;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${event.slug}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function daysUntil(dateStr: string): number {
  const target = new Date(`${dateStr}T00:00:00+01:00`);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

interface Props {
  readonly event: SiteEvent;
  /**
   * Pre-picked related events for the "Also upcoming" strip at the
   * bottom. The server page picks up to three same-status siblings so
   * this component doesn't have to know about the full CMS.
   */
  readonly related?: readonly SiteEvent[];
  /**
   * The contribute form, when this event has an open charge. A node
   * rather than data, so the panel stays one component shared with
   * projects and the AGM.
   */
  readonly contribute?: React.ReactNode;
}

export function EventDetail({ event, related = [], contribute }: Props) {
  const [days, setDays] = useState<number | null>(null);

  useEffect(() => {
    setDays(daysUntil(event.fullDate));
  }, [event.fullDate]);

  return (
    <>
      <EventHero event={event} days={days} />
      <EventBody event={event} contribute={contribute} />
      {/* Shown whenever the editor filled them in. These used to be gated
          on `featured` as well, so a programme and a set of flyers could
          be uploaded against an ordinary event and never appear anywhere.
          The extended description now runs inside the About section
          instead of a separate block. */}
      {event.program && event.program.length > 0 && <ProgrammeSection program={event.program} />}
      {event.flyers && event.flyers.length > 0 && (
        <FlyersSection flyers={event.flyers} title={event.title} />
      )}
      {related.length > 0 && <RelatedEvents events={related} />}
    </>
  );
}

function EventHero({ event, days }: { readonly event: SiteEvent; readonly days: number | null }) {
  return (
    <section
      data-nav-dark
      className="relative isolate flex min-h-[70svh] w-full items-end overflow-hidden bg-black pb-16 pt-32 text-white md:items-center md:pb-20 md:pt-40"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-20 overflow-hidden">
        <Image
          src={event.image}
          alt=""
          fill
          priority
          quality={75}
          sizes="100vw"
          className="object-cover opacity-40"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.9) 100%)',
          }}
        />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(50% 60% at 50% 40%, color-mix(in srgb, var(--color-primary) 18%, transparent) 0%, transparent 65%)',
        }}
      />

      <div className="relative mx-auto w-full max-w-350 px-5 md:px-8 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          className="mb-8 flex items-center gap-3 text-[11px] uppercase tracking-[0.28em] text-white/60"
        >
          <Link
            href="/events"
            className="inline-flex items-center gap-2 transition-colors hover:text-white"
          >
            <span aria-hidden>←</span> Back to events
          </Link>
        </motion.div>

        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.6 }}
          variants={fadeUp}
          className="font-heading text-[11px] font-medium uppercase text-primary md:text-xs"
          style={{ letterSpacing: '0.4em' }}
        >
          {event.category} · {event.upcoming ? 'Upcoming' : 'Past Event'}
        </motion.p>

        <motion.h1
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={revealParent}
          className="mt-6 font-heading font-thin leading-[1.05] text-white"
          style={{
            fontSize: 'clamp(2.25rem, 5.4vw, 5rem)',
            letterSpacing: '-0.02em',
          }}
        >
          <span className="block overflow-hidden pb-1 md:pb-2">
            <motion.span variants={revealLine} className="block">
              {event.title}
            </motion.span>
          </span>
        </motion.h1>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={fadeUp}
          custom={4}
          className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-white/75 md:text-base"
        >
          <span className="inline-flex items-center gap-2">
            <CalendarIcon />
            <span className="font-heading font-light">
              {event.day} {event.month} {event.year}
            </span>
          </span>
          <span className="h-4 w-px bg-white/20" aria-hidden />
          <span className="inline-flex items-center gap-2">
            <PinIcon />
            <span className="font-heading font-light">
              {event.location} · {event.city}
            </span>
          </span>
          {event.upcoming && days !== null && days > 0 && (
            <>
              <span className="h-4 w-px bg-white/20" aria-hidden />
              <span className="inline-flex items-center gap-2 rounded-xs border border-primary/40 bg-primary/15 px-3 py-1 text-[12px] font-medium uppercase tracking-[0.22em] text-white">
                In {days} {days === 1 ? 'day' : 'days'}
              </span>
            </>
          )}
        </motion.div>
      </div>
    </section>
  );
}

function EventBody({
  event,
  contribute,
}: {
  readonly event: SiteEvent;
  readonly contribute?: React.ReactNode;
}) {
  return (
    <section className="relative bg-white py-20 md:py-28">
      <div className="mx-auto max-w-350 px-5 md:px-8 lg:px-12">
        <div className="grid gap-12 md:grid-cols-12 md:gap-16 lg:gap-20">
          <div className="md:col-span-8">
            <motion.p
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.5 }}
              variants={fadeUp}
              className="font-heading text-[11px] font-medium uppercase tracking-[0.28em] text-primary"
            >
              About this event
            </motion.p>

            {/* In the body rather than the hero: over the banner it read as
                decoration and nobody reached for it. Here it sits where the
                reader has arrived and can act. */}
            <div className="mt-5 border-y border-black/8 py-3">
              <Engagement kind="event" entityId={event.id} countView />
            </div>

            {/* Only when the editor wrote a separate short summary —
                otherwise `description` is just the first paragraph of the
                body below, and printing it here says everything twice. */}
            {event.summary && (
              <motion.p
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.4 }}
                variants={fadeUp}
                custom={1}
                className="mt-6 max-w-2xl text-[17px] leading-[1.85] text-black/80 md:text-[18px]"
              >
                {event.summary}
              </motion.p>
            )}

            {/* The editor's own markup, styled by `news-article-body` —
                the same treatment news articles get. The description used
                to be flattened into bare paragraphs, so every heading,
                bold run, link and list an editor wrote came out as plain
                undifferentiated text. */}
            {event.descriptionHtml ? (
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={fadeUp}
                custom={2}
                className="news-article-body mt-8 max-w-2xl text-[16px] leading-[1.85] text-black/75"
                dangerouslySetInnerHTML={{ __html: event.descriptionHtml }}
              />
            ) : (
              <motion.p
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.4 }}
                variants={fadeUp}
                custom={2}
                className="mt-6 max-w-2xl text-[17px] leading-[1.85] text-black/80 md:text-[18px]"
              >
                {event.description}
              </motion.p>
            )}
          </div>

          <aside className="md:col-span-4">
            <div className="sticky top-28 space-y-6">
              <EventCard event={event} />
              <ActionCard event={event} contribute={contribute} />
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function EventCard({ event }: { readonly event: SiteEvent }) {
  return (
    <div className="overflow-hidden rounded-xs border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="relative aspect-4/3">
        <Image
          src={event.image}
          alt=""
          fill
          sizes="360px"
          quality={75}
          className="object-cover object-top"
        />
        <div className="absolute left-4 top-4 flex flex-col items-center rounded-xs bg-white/95 px-3 py-2 text-center shadow-md backdrop-blur-sm">
          <span className="font-heading text-[10px] font-medium uppercase tracking-[0.24em] text-primary">
            {event.month}
          </span>
          <span
            className="font-heading font-light leading-none tracking-tight text-black"
            style={{ fontSize: '1.6rem' }}
          >
            {event.day}
          </span>
          <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-black/50">
            {event.year}
          </span>
        </div>
      </div>
      <div className="p-5 md:p-6">
        <ul className="space-y-3.5 text-[13.5px] text-black/70">
          <li className="flex items-start gap-3">
            <CalendarIcon />
            <span>
              <span className="font-heading font-medium text-black">
                {event.day} {event.month} {event.year}
              </span>
              <br />
              <span className="text-black/50">09:00 – 17:00</span>
            </span>
          </li>
          <li className="flex items-start gap-3">
            <PinIcon />
            <span>
              <span className="font-heading font-medium text-black">{event.location}</span>
              <br />
              <span className="text-black/50">{event.city}</span>
            </span>
          </li>
          <li className="flex items-start gap-3">
            <TagIcon />
            <span>
              <span className="font-heading font-medium text-black">{event.category}</span>
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}

function ActionCard({
  event,
  contribute,
}: {
  readonly event: SiteEvent;
  readonly contribute?: React.ReactNode;
}) {
  const share = async () => {
    if (typeof navigator === 'undefined') return;
    if ('share' in navigator) {
      try {
        await navigator.share({
          title: event.title,
          url: window.location.href,
        });
        return;
      } catch {
        /* no-op */
      }
    }
    if (navigator.clipboard) await navigator.clipboard.writeText(window.location.href);
  };

  return (
    <div className="flex flex-col gap-3 rounded-xs border border-black/10 bg-white p-5 md:p-6">
      {/* The contribute form when this event has an open charge. It stands
          in for a "Register interest" button that was a `<button>` with no
          handler — it looked live and did nothing on every event page.
          Withheld once the event is past: nobody should be taking money
          for a gathering that already happened. */}
      {event.upcoming ? contribute : null}
      {event.albumSlug && (
        <Link
          href={`/gallery/${event.albumSlug}`}
          className="group inline-flex items-center justify-center gap-3 rounded-xs border border-primary/40 bg-primary/5 px-5 py-3.5 text-sm font-medium tracking-wide text-primary transition-all duration-500 hover:-translate-y-0.5 hover:border-primary hover:bg-primary hover:text-white"
        >
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
            <rect x="3" y="3" width="18" height="18" rx="1.5" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="m21 15-5-5L5 21" />
          </svg>
          <span>View the photo album</span>
          <span
            aria-hidden
            className="grid h-6 w-6 place-items-center rounded-xs bg-primary/10 transition-transform duration-500 group-hover:translate-x-1 group-hover:bg-white/20"
          >
            →
          </span>
        </Link>
      )}
      {/* Only forward-looking events get a calendar entry — there is
          nothing to diarise about a date that has passed. */}
      {event.upcoming && (
        <button
          type="button"
          onClick={() => saveToCalendar(event)}
          className="inline-flex items-center justify-center gap-3 rounded-xs border border-black/15 bg-white px-5 py-3.5 text-sm font-medium tracking-wide text-black transition-all duration-500 hover:-translate-y-0.5 hover:border-primary hover:text-primary"
        >
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
            <rect x="3" y="4" width="18" height="18" rx="1.5" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          Save to Calendar
        </button>
      )}
      <button
        type="button"
        onClick={share}
        className="inline-flex items-center justify-center gap-3 rounded-xs border border-black/10 bg-white px-5 py-3 text-[13px] font-medium tracking-wide text-black/70 transition-colors hover:border-black/25 hover:text-black"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" />
        </svg>
        Share
      </button>
    </div>
  );
}

function RelatedEvents({ events }: { readonly events: readonly SiteEvent[] }) {
  return (
    <section
      className="relative overflow-hidden py-20 md:py-24"
      style={{
        background:
          'linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 3%, white) 0%, color-mix(in srgb, var(--color-primary) 5%, white) 100%)',
      }}
    >
      <div className="mx-auto max-w-350 px-5 md:px-8 lg:px-12">
        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.6 }}
          variants={fadeUp}
          className="font-heading text-sm font-medium uppercase tracking-[0.28em] text-primary"
        >
          Also on the calendar
        </motion.p>

        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={fadeUp}
          custom={1}
          className="mt-5 font-heading font-thin leading-[1.05] text-black"
          style={{
            fontSize: 'clamp(1.65rem, 3.4vw, 2.75rem)',
            letterSpacing: '-0.02em',
          }}
        >
          Keep the calendar <span className="italic text-primary">full.</span>
        </motion.h2>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 md:mt-14 md:gap-6 lg:grid-cols-3">
          {events.map((e, i) => (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.65, delay: 0.1 + i * 0.08, ease }}
            >
              <RelatedCard event={e} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RelatedCard({ event }: { readonly event: SiteEvent }) {
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
      </div>
      <div className="flex flex-1 flex-col p-5 md:p-6">
        <p className="font-heading text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">
          {event.category}
        </p>
        <h3
          className="mt-2 font-heading font-light leading-tight text-black transition-colors duration-500 group-hover:text-primary"
          style={{ fontSize: '1.05rem', letterSpacing: '-0.005em' }}
        >
          {event.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-[13px] leading-[1.6] text-black/55">
          {event.location} · {event.city}
        </p>
      </div>
    </Link>
  );
}

/**
 * Split a programme into days. Slots carrying no date fall into one
 * unlabelled group, which is the single-day case and by far the common
 * one; a multi-day event dates each slot and gets a header per day.
 */
function groupProgrammeByDay(program: readonly import('./events-content').ProgramItem[]) {
  const groups = new Map<
    string,
    { key: string; label: string; items: import('./events-content').ProgramItem[] }
  >();

  for (const item of program) {
    const key = item.day ?? '';
    const existing = groups.get(key);
    if (existing) {
      existing.items.push(item);
      continue;
    }
    groups.set(key, { key: key || 'undated', label: formatDayLabel(key), items: [item] });
  }

  return Array.from(groups.values());
}

/** "Friday 13 November" from an ISO date; blank stays blank. */
function formatDayLabel(iso: string): string {
  if (!iso) return '';
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

function ProgrammeSection({
  program,
}: {
  readonly program: readonly import('./events-content').ProgramItem[];
}) {
  const days = groupProgrammeByDay(program);

  return (
    <section
      className="relative overflow-hidden py-20 md:py-24"
      style={{
        background:
          'linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 3%, white) 0%, color-mix(in srgb, var(--color-primary) 5%, white) 100%)',
      }}
    >
      <div className="mx-auto max-w-350 px-5 md:px-8 lg:px-12">
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
          style={{
            fontSize: 'clamp(1.85rem, 3.8vw, 3rem)',
            letterSpacing: '-0.02em',
          }}
        >
          {days.length > 1 ? (
            <>
              Day by day, <span className="italic text-primary">hour by hour.</span>
            </>
          ) : (
            <>
              The full day, <span className="italic text-primary">hour by hour.</span>
            </>
          )}
        </motion.h2>

        <div className="mt-12 flex flex-col gap-10 md:mt-16 md:gap-14">
          {days.map((group, gi) => (
            <div key={group.key}>
              {/* A dated header only when the programme actually spans
                  days — a single-day agenda repeats its own date for
                  nothing. */}
              {days.length > 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ duration: 0.6, ease }}
                  className="mb-5 flex flex-wrap items-baseline gap-x-4 gap-y-2 md:mb-7"
                >
                  <span className="rounded-xs bg-primary px-3 py-1.5 font-heading text-[10px] font-semibold uppercase tracking-[0.24em] text-white">
                    Day {gi + 1}
                  </span>
                  <h3
                    className="font-heading font-thin leading-none text-black"
                    style={{ fontSize: 'clamp(1.2rem, 2.4vw, 1.75rem)', letterSpacing: '-0.02em' }}
                  >
                    {group.label}
                  </h3>
                  <span aria-hidden className="h-px flex-1 bg-black/12" />
                  <span className="font-heading text-[11px] font-medium uppercase tracking-[0.24em] text-black/45">
                    {group.items.length} {group.items.length === 1 ? 'session' : 'sessions'}
                  </span>
                </motion.div>
              )}

              {/* Each session is its own card rather than a row on a
                  ruled spine. The diamonds and the vertical line were
                  decoration standing in for structure; a time set as a
                  proper label and real space between sessions does the
                  same job and reads at a glance. */}
              <ol className="flex flex-col gap-3 md:gap-4">
                {group.items.map((item, i) => (
                  <motion.li
                    key={`${item.time}-${item.title}-${i}`}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.55, delay: 0.04 + Math.min(i, 6) * 0.05, ease }}
                    className="group grid grid-cols-1 items-start gap-3 rounded-xs border border-black/8 bg-white p-5 transition-all duration-500 hover:border-primary/30 hover:shadow-[0_14px_36px_-18px_rgba(139,21,51,0.22)] md:grid-cols-[132px_1fr] md:gap-8 md:p-6"
                  >
                    {/* The time reads as a label, not a list marker. */}
                    <div className="flex items-center gap-3 md:block">
                      {item.time ? (
                        <span className="inline-flex items-center rounded-xs bg-primary/8 px-3 py-1.5 font-heading text-[13px] font-semibold tabular-nums leading-none text-primary transition-colors duration-500 group-hover:bg-primary group-hover:text-white md:text-[14px]">
                          {item.time}
                        </span>
                      ) : (
                        <span className="font-heading text-[11px] font-medium uppercase tracking-[0.24em] text-black/35">
                          To be confirmed
                        </span>
                      )}
                    </div>

                    <div>
                      <h4
                        className="font-heading font-light leading-snug text-black"
                        style={{ fontSize: '1.15rem', letterSpacing: '-0.005em' }}
                      >
                        {item.title}
                      </h4>
                      {item.description && (
                        <p className="mt-2 max-w-2xl text-[14.5px] leading-[1.75] text-black/60">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </motion.li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FlyersSection({
  flyers,
  title,
}: {
  readonly flyers: readonly string[];
  readonly title: string;
}) {
  return (
    <section className="relative bg-white py-20 md:py-24">
      <div className="mx-auto max-w-350 px-5 md:px-8 lg:px-12">
        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.6 }}
          variants={fadeUp}
          className="font-heading text-sm font-medium uppercase tracking-[0.28em] text-primary"
        >
          Media
        </motion.p>

        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={fadeUp}
          custom={1}
          className="mt-5 font-heading font-thin leading-[1.05] text-black"
          style={{
            fontSize: 'clamp(1.85rem, 3.8vw, 3rem)',
            letterSpacing: '-0.02em',
          }}
        >
          Feel free to <span className="italic text-primary">share these.</span>
        </motion.h2>

        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={fadeUp}
          custom={2}
          className="mt-5 max-w-xl text-[15px] leading-[1.7] text-black/60"
        >
          Everything published around this event. Print it, post it, forward it to the fellow
          Shesans you know.
        </motion.p>

        {/* Masonry, not a grid of fixed boxes. Flyers arrive in whatever
            shape the designer exported — A4 portrait, square for social,
            the odd landscape banner — and a fixed 3/4 box cropped every
            one that disagreed. CSS columns let each poster keep its own
            height, so nothing is cut. */}
        <div className="mt-12 columns-1 gap-5 sm:columns-2 md:mt-14 md:gap-6 lg:columns-3">
          {flyers.map((flyer, i) => (
            <motion.a
              key={flyer + i}
              href={flyer}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.7, delay: 0.05 + (i % 3) * 0.08, ease }}
              className="group relative mb-5 block break-inside-avoid overflow-hidden rounded-xs border border-black/8 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-500 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_18px_40px_-12px_rgba(139,21,51,0.16)] md:mb-6"
            >
              {/* A plain img: the intrinsic ratio is the layout, and the
                  flyers' dimensions are not stored anywhere for next/image
                  to size a box from. */}
              <img
                src={flyer}
                alt={`${title}, flyer ${i + 1}`}
                loading="lazy"
                decoding="async"
                className="block h-auto w-full transition-transform duration-1000 group-hover:scale-[1.03]"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-500 group-hover:bg-black/25"
              />
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0 text-primary"
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
  );
}

function PinIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0 text-primary"
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

function TagIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0 text-primary"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <circle cx="7" cy="7" r="1.5" />
    </svg>
  );
}
