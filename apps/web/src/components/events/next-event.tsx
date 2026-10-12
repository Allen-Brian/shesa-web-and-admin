'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import { useEffect, useState } from 'react';

import type { SiteEvent } from './events-content';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, delay: i * 0.1, ease },
  }),
};

function daysUntil(dateStr: string): number | null {
  if (!dateStr) return null;
  const target = new Date(`${dateStr}T00:00:00+01:00`);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

interface Props {
  /** Currently featured event (or the next upcoming), omit to hide this section. */
  readonly featuredEvent?: SiteEvent | null;
}

export function NextEvent({ featuredEvent }: Props) {
  const [days, setDays] = useState<number | null>(null);

  useEffect(() => {
    if (!featuredEvent) return;
    setDays(daysUntil(featuredEvent.fullDate));
  }, [featuredEvent]);

  if (!featuredEvent) return null;

  return (
    <section className="relative overflow-hidden bg-white py-20 md:py-24">
      <div className="mx-auto max-w-350 px-5 md:px-8 lg:px-12">
        <div className="mb-8 flex items-baseline justify-between gap-4 md:mb-12">
          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.6 }}
            variants={fadeUp}
            className="font-heading text-[11px] font-medium uppercase tracking-[0.32em] text-primary"
          >
            The Next Big One
          </motion.p>
          {days !== null && days > 0 && (
            <motion.p
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.6 }}
              variants={fadeUp}
              custom={1}
              className="text-[11px] font-medium uppercase tracking-[0.24em] text-black/50"
            >
              In {days} {days === 1 ? 'day' : 'days'}
            </motion.p>
          )}
        </div>

        <motion.article
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.9, ease }}
          className="grid gap-8 md:grid-cols-12 md:gap-10 lg:gap-14"
        >
          <div className="relative md:col-span-7">
            <div className="relative aspect-4/3 overflow-hidden rounded-xs md:aspect-16/11">
              <Image
                src={featuredEvent.image}
                alt={featuredEvent.title}
                fill
                priority
                sizes="(min-width: 768px) 60vw, 100vw"
                quality={75}
                className="object-cover"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background: 'linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)',
                }}
              />
              <div className="absolute left-5 top-5 flex flex-col items-center rounded-xs bg-white/95 px-3 py-2 text-center shadow-md backdrop-blur-sm md:left-6 md:top-6 md:px-4 md:py-3">
                <span className="font-heading text-[10px] font-medium uppercase tracking-[0.24em] text-primary md:text-[11px]">
                  {featuredEvent.month}
                </span>
                <span
                  className="font-heading font-light leading-none tracking-tight text-black"
                  style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)' }}
                >
                  {featuredEvent.day}
                </span>
                <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-black/50">
                  {featuredEvent.year}
                </span>
              </div>
              <span className="absolute right-5 top-5 rounded-xs bg-black/55 px-3 py-1 font-heading text-[10px] font-medium uppercase tracking-[0.24em] text-white backdrop-blur-sm md:right-6 md:top-6">
                {featuredEvent.category}
              </span>
            </div>
          </div>

          <div className="flex flex-col justify-center md:col-span-5">
            <p className="font-heading text-xs font-medium uppercase tracking-[0.28em] text-primary">
              Featured Event
            </p>

            <h2
              className="mt-4 font-heading font-thin leading-[1.05] text-black"
              style={{
                fontSize: 'clamp(1.85rem, 3.8vw, 3rem)',
                letterSpacing: '-0.02em',
              }}
            >
              {featuredEvent.title}
            </h2>

            <div className="mt-6 flex flex-col gap-2 text-[13px] text-black/70">
              <div className="flex items-center gap-3">
                <CalendarIcon />
                <span>
                  {featuredEvent.day} {featuredEvent.month} {featuredEvent.year}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <PinIcon />
                <span>
                  {featuredEvent.location} · {featuredEvent.city}
                </span>
              </div>
            </div>

            <p className="mt-6 max-w-md text-[15px] leading-[1.75] text-black/70">
              {featuredEvent.description}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href={`/events/${featuredEvent.slug}`}
                className="group inline-flex items-center gap-3 rounded-xs bg-black px-6 py-3.5 text-sm font-medium tracking-wide text-white transition-all duration-500 hover:-translate-y-0.5 hover:bg-primary hover:shadow-[0_18px_40px_-12px_rgba(139,21,51,0.35)]"
              >
                <span>Learn more</span>
                <span
                  aria-hidden
                  className="grid h-6 w-6 place-items-center rounded-xs bg-white/15 transition-transform duration-500 group-hover:translate-x-1"
                >
                  →
                </span>
              </Link>
            </div>
          </div>
        </motion.article>
      </div>
    </section>
  );
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 text-primary"
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
      className="h-4 w-4 text-primary"
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
