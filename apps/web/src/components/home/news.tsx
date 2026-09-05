'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import { Newspaper } from 'lucide-react';

import { EmptyState } from '@/components/ui/empty-state';
import type { HomeNewsItem } from '@/lib/home-data';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, delay: i * 0.08, ease },
  }),
};

interface Props {
  readonly articles: readonly HomeNewsItem[];
}

/**
 * Latest news on the home page. The lead article runs wide with its
 * banner; the rest stack beside it as text rows, so the strip reads as
 * a front page rather than four identical cards.
 *
 * Articles open at `/news?id=…` — the news page selects by query param
 * and there is no per-article route.
 */
export function News({ articles }: Props) {
  const [lead, ...rest] = articles;

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
              Latest News
            </motion.p>

            <motion.h2
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.4 }}
              variants={fadeUp}
              custom={1}
              className="mt-5 font-heading font-thin leading-[1.05] text-black"
              style={{ fontSize: 'clamp(1.85rem, 3.8vw, 3.5rem)', letterSpacing: '-0.02em' }}
            >
              What the network is <span className="italic text-primary">talking about.</span>
            </motion.h2>
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            variants={fadeUp}
            custom={2}
            className="md:col-span-4 md:text-right"
          >
            <Link
              href="/news"
              className="group inline-flex items-center gap-3 text-sm font-medium text-black transition-colors hover:text-primary"
            >
              Read the newsroom
              <span
                aria-hidden
                className="grid h-8 w-8 place-items-center rounded-xs border border-black/20 transition-all duration-300 group-hover:translate-x-1 group-hover:border-primary group-hover:bg-primary group-hover:text-white"
              >
                →
              </span>
            </Link>
          </motion.div>
        </div>

        {!lead ? (
          <div className="mx-auto mt-12 max-w-3xl md:mt-16">
            <EmptyState
              icon={Newspaper}
              heading="No stories published yet"
              body="Announcements, features, and reports from across the network will appear here once the newsroom is live."
              cta={{ label: 'Contact us', href: '/contact' }}
            />
          </div>
        ) : (
          <div className="mt-12 grid gap-8 md:mt-16 md:grid-cols-12 md:gap-10">
            <motion.article
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.8, ease }}
              className="md:col-span-7"
            >
              <Link href={`/news?id=${lead.id}`} className="group block">
                <div className="relative aspect-3/2 overflow-hidden rounded-xs">
                  <Image
                    src={lead.image}
                    alt={lead.title}
                    fill
                    sizes="(min-width: 768px) 58vw, 100vw"
                    quality={75}
                    className="object-cover transition-transform duration-1000 group-hover:scale-105"
                  />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.5) 100%)',
                    }}
                  />
                  <span className="absolute left-4 top-4 rounded-xs bg-white/95 px-2.5 py-1 font-heading text-[10px] font-medium uppercase tracking-[0.22em] text-primary backdrop-blur-sm">
                    {lead.category}
                  </span>
                </div>

                <div className="mt-5">
                  <Meta date={lead.date} author={lead.author} />
                  <h3
                    className="mt-3 font-heading font-light leading-tight text-black transition-colors duration-500 group-hover:text-primary"
                    style={{ fontSize: 'clamp(1.3rem, 2.4vw, 1.9rem)', letterSpacing: '-0.01em' }}
                  >
                    {lead.title}
                  </h3>
                  {lead.excerpt && (
                    <p className="mt-3 line-clamp-3 max-w-2xl text-[14.5px] leading-[1.7] text-black/60">
                      {lead.excerpt}
                    </p>
                  )}
                </div>
              </Link>
            </motion.article>

            <div className="flex flex-col md:col-span-5">
              {rest.map((article, i) => (
                <motion.article
                  key={article.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.35 }}
                  transition={{ duration: 0.7, delay: 0.1 + i * 0.08, ease }}
                  className="border-t border-black/10 py-5 first:border-t-0 first:pt-0 last:pb-0 md:py-6"
                >
                  <Link href={`/news?id=${article.id}`} className="group flex items-start gap-4">
                    <div className="relative aspect-square w-20 shrink-0 overflow-hidden rounded-xs md:w-24">
                      <Image
                        src={article.image}
                        alt=""
                        fill
                        sizes="96px"
                        quality={70}
                        className="object-cover transition-transform duration-1000 group-hover:scale-105"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <Meta date={article.date} author={article.author} />
                      <h3
                        className="mt-2 font-heading text-[15.5px] font-light leading-snug text-black transition-colors duration-500 group-hover:text-primary md:text-base"
                        style={{ letterSpacing: '-0.005em' }}
                      >
                        {article.title}
                      </h3>
                    </div>
                  </Link>
                </motion.article>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/** Date, and the author when the CMS has one. */
function Meta({ date, author }: { readonly date: string; readonly author: string }) {
  return (
    <p className="font-heading text-[10.5px] font-medium uppercase tracking-[0.22em] text-black/45">
      {date}
      {author ? ` · ${author}` : ''}
    </p>
  );
}
