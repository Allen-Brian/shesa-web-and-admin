'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import { useRef, useState } from 'react';

import { isLocalSupabaseUrl } from '../leadership/is-local-supabase-url';
import type { Article } from './news-content';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.85, delay: i * 0.1, ease },
  }),
};

interface Props {
  /** Featured articles for the top carousel. Empty → the carousel hides. */
  readonly featured: readonly Article[];
}

/**
 * Public News page hero, headline + description on the left,
 * horizontal Featured carousel on the right. Each card is a Link
 * back to `/news?id={article.id}` so clicking sets the reader's
 * active article without a full navigation cycle in the reader.
 */
export function NewsHero({ featured }: Props) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [reachStart, setReachStart] = useState(true);
  const [reachEnd, setReachEnd] = useState(false);

  const scrollBy = (dx: number) => {
    scrollerRef.current?.scrollBy({ left: dx, behavior: 'smooth' });
  };

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setReachStart(el.scrollLeft <= 4);
    setReachEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  };

  return (
    <section className="relative overflow-hidden bg-white pb-14 pt-32 md:pt-40">
      <div className="mx-auto max-w-350 px-5 md:px-8 lg:px-12">
        <div className="grid gap-10 md:grid-cols-12 md:gap-10">
          <div className="md:col-span-4">
            <motion.p
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.6 }}
              variants={fadeUp}
              className="font-heading text-sm font-medium uppercase tracking-[0.28em] text-primary"
            >
              News
            </motion.p>

            <motion.h1
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
              In the <span className="italic text-primary">news.</span>
            </motion.h1>

            <motion.p
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.5 }}
              variants={fadeUp}
              custom={2}
              className="mt-6 max-w-md text-[15px] leading-[1.7] text-black/60"
            >
              Every dispatch, every announcement, every proud milestone. The official record of what
              the movement is up to, in one place.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.9, delay: 0.3, ease }}
            className="relative md:col-span-8"
          >
            <div className="mb-3 flex items-center justify-between gap-4">
              <p className="font-heading text-[11px] font-medium uppercase tracking-[0.28em] text-black/60">
                Featured
              </p>
              {featured.length > 1 && (
                <div className="flex items-center gap-2">
                  <ScrollArrow
                    direction="left"
                    disabled={reachStart}
                    onClick={() => scrollBy(-360)}
                  />
                  <ScrollArrow
                    direction="right"
                    disabled={reachEnd}
                    onClick={() => scrollBy(360)}
                  />
                </div>
              )}
            </div>

            {featured.length === 0 ? (
              <p className="rounded-xs border border-dashed border-black/12 bg-black/2 p-8 text-center text-sm text-black/50">
                No featured articles yet.
              </p>
            ) : (
              <div
                ref={scrollerRef}
                onScroll={onScroll}
                className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2"
                data-lenis-prevent-wheel
                style={{ scrollbarWidth: 'none' }}
              >
                {featured.map((article) => (
                  <Link
                    key={article.id}
                    href={`/news?id=${article.id}`}
                    scroll={false}
                    className="group relative aspect-3/2 w-70 shrink-0 snap-start overflow-hidden rounded-xs md:w-80"
                  >
                    {article.bannerUrl && (
                      <Image
                        src={article.bannerUrl}
                        alt=""
                        fill
                        sizes="320px"
                        quality={75}
                        unoptimized={isLocalSupabaseUrl(article.bannerUrl)}
                        className="object-cover object-top transition-transform duration-700 group-hover:scale-105"
                      />
                    )}
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background:
                          'linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.7) 100%)',
                      }}
                    />
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-white/80">
                        {article.categories[0] ?? 'Featured'}
                      </p>
                      <p
                        className="mt-1 line-clamp-2 font-heading font-light leading-tight text-white"
                        style={{ fontSize: '0.95rem', letterSpacing: '-0.005em' }}
                      >
                        {article.title}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      <div
        aria-hidden
        className="mt-12 h-px w-full"
        style={{
          background: 'linear-gradient(to right, transparent, rgba(0,0,0,0.1), transparent)',
        }}
      />
    </section>
  );
}

function ScrollArrow({
  direction,
  onClick,
  disabled,
}: {
  readonly direction: 'left' | 'right';
  readonly onClick: () => void;
  readonly disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === 'left' ? 'Scroll left' : 'Scroll right'}
      className="grid h-9 w-9 place-items-center rounded-xs border border-black/15 text-black/60 transition-all duration-300 hover:border-primary hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-black/15 disabled:hover:bg-transparent disabled:hover:text-black/60"
    >
      <span aria-hidden>{direction === 'left' ? '←' : '→'}</span>
    </button>
  );
}
