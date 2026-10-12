'use client';

import Image from 'next/image';

import { isLocalSupabaseUrl } from './is-local-supabase-url';
import Link from 'next/link';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, delay: i * 0.08, ease },
  }),
};

export type BatchPresident = {
  readonly name: string;
  readonly batch: string;
  readonly photo: string;
  readonly slug: string;
};
const PAGE_SIZE = 15;
const AUTO_ADVANCE_MS = 8000;

interface BatchPresidentsProps {
  /** Live batch chairs from the CMS. Empty → the whole section short-circuits. */
  readonly presidents: readonly BatchPresident[];
}

export function BatchPresidents({ presidents }: BatchPresidentsProps) {
  const reduce = useReducedMotion();
  const batches = useMemo(() => presidents, [presidents]);
  if (batches.length === 0) return null;
  const pages = useMemo(() => {
    const out: BatchPresident[][] = [];
    for (let i = 0; i < batches.length; i += PAGE_SIZE) {
      out.push(batches.slice(i, i + PAGE_SIZE));
    }
    return out;
  }, [batches]);

  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (reduce || paused) return;
    const id = setInterval(() => {
      setPage((p) => (p + 1) % pages.length);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [reduce, paused, pages.length]);

  const goPrev = () => setPage((p) => (p - 1 + pages.length) % pages.length);
  const goNext = () => setPage((p) => (p + 1) % pages.length);

  return (
    <section className="relative overflow-hidden bg-white py-20 text-black md:py-28">
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
              The Batches
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
              Every era. A <span className="italic text-primary">leader.</span>
            </motion.h2>
          </div>

          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            variants={fadeUp}
            custom={2}
            className="max-w-md text-[15px] leading-[1.7] text-black/60 md:col-span-4 md:pb-3"
          >
            One class president per graduating batch, {batches.length} unbroken batches from{' '}
            {batches[batches.length - 1]?.batch} to {batches[0]?.batch}.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.9, delay: 0.2, ease }}
          className="mt-14 md:mt-16"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="overflow-hidden">
            <motion.div
              className="flex touch-pan-y"
              animate={{ x: `-${page * 100}%` }}
              transition={{ duration: 0.75, ease }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.15}
              onDragEnd={(_, info) => {
                const threshold = 60;
                if (info.offset.x < -threshold) goNext();
                else if (info.offset.x > threshold) goPrev();
              }}
            >
              {pages.map((pageItems, pi) => (
                <div
                  key={pi}
                  className="grid w-full shrink-0 auto-rows-min grid-cols-3 items-start gap-3 pr-2 sm:grid-cols-4 md:gap-4 md:pr-4 lg:grid-cols-5"
                  aria-hidden={pi !== page}
                >
                  {pageItems.map((b) => (
                    <BatchCard key={b.slug} president={b} />
                  ))}
                </div>
              ))}
            </motion.div>
          </div>

          <div className="mt-8 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous page of batches"
              className="group grid h-10 w-10 place-items-center rounded-xs border border-black/15 text-black/70 transition-all duration-300 hover:-translate-x-0.5 hover:border-primary hover:bg-primary hover:text-white"
            >
              <span aria-hidden>←</span>
            </button>

            <div className="flex flex-1 items-center justify-center gap-2">
              {pages.map((_, i) => {
                const active = i === page;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPage(i)}
                    aria-label={`Show page ${i + 1}`}
                    aria-current={active}
                    className={`group relative h-1 overflow-hidden rounded-full transition-all duration-500 ${
                      active ? 'w-12 bg-black/10' : 'w-6 bg-black/15 hover:bg-black/30'
                    }`}
                  >
                    {active && (
                      <span
                        aria-hidden
                        key={page}
                        className="absolute inset-y-0 left-0 block bg-primary"
                        style={
                          paused || reduce
                            ? { width: '100%' }
                            : {
                                width: '100%',
                                animation: `carousel-progress ${AUTO_ADVANCE_MS}ms linear forwards`,
                              }
                        }
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={goNext}
              aria-label="Next page of batches"
              className="group grid h-10 w-10 place-items-center rounded-xs border border-black/15 text-black/70 transition-all duration-300 hover:translate-x-0.5 hover:border-primary hover:bg-primary hover:text-white"
            >
              <span aria-hidden>→</span>
            </button>
          </div>

          <p className="mt-4 text-center font-heading text-[11px] font-medium uppercase tracking-[0.28em] text-black/50">
            {String(page + 1).padStart(2, '0')} · {String(pages.length).padStart(2, '0')} · Batches{' '}
            {pages[page]?.[0]?.batch}
            {pages[page] && pages[page].length > 1
              ? `–${pages[page][pages[page].length - 1]?.batch}`
              : ''}
          </p>
        </motion.div>
      </div>
    </section>
  );
}

function BatchCard({ president }: { readonly president: BatchPresident }) {
  return (
    <Link
      href={`/leadership/batches/${president.slug}`}
      className="group relative block overflow-hidden rounded-xs border border-black/8 bg-white transition-all duration-500 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_18px_40px_-12px_rgba(139,21,51,0.16)]"
    >
      <div className="relative aspect-square overflow-hidden">
        <Image
          src={president.photo}
          alt={president.name}
          fill
          sizes="(min-width: 1024px) 15vw, (min-width: 640px) 22vw, 33vw"
          quality={75}
          unoptimized={isLocalSupabaseUrl(president.photo)}
          className="pointer-events-none object-cover object-top transition-transform duration-1000 group-hover:scale-105"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.72) 100%)',
          }}
        />
        <span className="absolute right-2 top-2 rounded-xs bg-black/55 px-2 py-0.5 font-heading text-[10px] font-medium tracking-[0.2em] text-white backdrop-blur-sm">
          {president.batch}
        </span>
      </div>
      <div className="p-3 md:p-4">
        <h3
          className="truncate font-heading font-light leading-tight text-black transition-colors duration-500 group-hover:text-primary"
          style={{ fontSize: '0.9rem', letterSpacing: '-0.005em' }}
        >
          {president.name}
        </h3>
        <p className="mt-0.5 text-[10.5px] font-medium uppercase tracking-[0.22em] text-black/50">
          Batch of {president.batch}
        </p>
      </div>
    </Link>
  );
}
