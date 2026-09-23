'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import { CalendarClock } from 'lucide-react';

import { EmptyState } from '@/components/ui/empty-state';

import { MarqueeCarousel } from './marquee-carousel';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, delay: i * 0.1, ease },
  }),
};

type Event = {
  readonly id: string;
  readonly title: string;
  readonly day: string;
  readonly month: string;
  readonly year: string;
  readonly location: string;
  readonly city: string;
  readonly image: string;
  readonly slug: string;
};

interface EventsProps {
  readonly events: readonly Event[];
}

export function Events({ events }: EventsProps) {
  return (
    <section className="relative overflow-hidden bg-white py-20 text-black md:py-24">
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
              Our Events
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
              Where the brotherhood <span className="italic text-primary">gathers.</span>
            </motion.h2>
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            variants={fadeUp}
            custom={2}
            className="md:col-span-4 md:flex md:justify-end"
          >
            <ViewMoreLink href="/events">View all events</ViewMoreLink>
          </motion.div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.9, delay: 0.3, ease }}
        className="mt-12 md:mt-16"
      >
        {events.length === 0 ? (
          <div className="mx-auto max-w-3xl px-5 md:px-8">
            <EmptyState
              icon={CalendarClock}
              heading="No upcoming events yet"
              body="Reunions, ceremonies, and summits will land here as soon as they're on the calendar. Check back or reach out if you'd like an invite."
              cta={{ label: 'Contact us', href: '/contact' }}
            />
          </div>
        ) : (
          <MarqueeCarousel
            items={events}
            duration={50}
            ariaLabel="Our events"
            renderItem={(event) => <EventCard event={event} />}
          />
        )}
      </motion.div>
    </section>
  );
}

function EventCard({ event }: { readonly event: Event }) {
  return (
    <Link
      href={`/events/${event.slug}`}
      className="group relative flex h-full w-[300px] flex-col overflow-hidden rounded-xs border border-black/8 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-500 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_18px_40px_-12px_rgba(139,21,51,0.18)] sm:w-[340px] md:w-[380px]"
    >
      <div className="relative aspect-3/2 shrink-0 overflow-hidden">
        <Image
          src={event.image}
          alt={event.title}
          fill
          sizes="380px"
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
            style={{ fontSize: '1.5rem' }}
          >
            {event.day}
          </span>
          <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-black/50">
            {event.year}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5 md:p-6">
        <h3
          className="line-clamp-2 font-heading font-light leading-tight text-black transition-colors duration-500 group-hover:text-primary"
          style={{ fontSize: '1.15rem', letterSpacing: '-0.01em' }}
        >
          {event.title}
        </h3>
        <div className="mt-3 flex items-center gap-2 text-sm text-black/55">
          <PinIcon />
          <span className="truncate">{event.location}</span>
        </div>
        <p className="mt-1 pl-5 text-xs text-black/45">{event.city}</p>
      </div>
    </Link>
  );
}

function ViewMoreLink({
  href,
  children,
}: {
  readonly href: string;
  readonly children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-3 text-sm font-medium text-black transition-colors hover:text-primary"
    >
      <span>{children}</span>
      <span
        aria-hidden
        className="grid h-8 w-8 place-items-center rounded-xs border border-black/20 transition-all duration-300 group-hover:translate-x-1 group-hover:border-primary group-hover:bg-primary group-hover:text-white"
      >
        →
      </span>
    </Link>
  );
}

function PinIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5 shrink-0"
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
