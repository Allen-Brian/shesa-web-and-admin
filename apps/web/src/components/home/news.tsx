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
 * Latest news on the home page — three cards of equal weight, matching
 * the Events and Projects strips above and below it.
 *
 * Articles open at `/news?id=…` — the news page selects by query param
 * and there is no per-article route.
 */
export function News({ articles }: Props) {
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

        {articles.length === 0 ? (
          <div className="mx-auto mt-12 max-w-3xl md:mt-16">
            <EmptyState
              icon={Newspaper}
              heading="No stories published yet"
              body="Announcements, features, and reports from across the network will appear here once the newsroom is live."
              cta={{ label: 'Contact us', href: '/contact' }}
            />
          </div>
        ) : (
          /* Three equal cards rather than one lead and a stack of rows —
             every story gets the same weight, and the row of tops and
             bottoms stays level however long a headline runs. */
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 md:mt-16 md:gap-8 lg:grid-cols-3">
            {articles.map((article, i) => (
              <motion.article
                key={article.id}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.7, delay: 0.05 + (i % 3) * 0.08, ease }}
                className="h-full"
              >
                <Link
                  href={`/news?id=${article.id}`}
                  className="group flex h-full flex-col overflow-hidden rounded-xs border border-black/8 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-500 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_18px_40px_-12px_rgba(139,21,51,0.16)]"
                >
                  <div className="relative aspect-3/2 shrink-0 overflow-hidden">
                    <Image
                      src={article.image}
                      alt={article.title}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      quality={75}
                      className="object-cover object-top transition-transform duration-1000 group-hover:scale-105"
                    />
                    <span className="absolute left-4 top-4 rounded-xs bg-white/95 px-2.5 py-1 font-heading text-[10px] font-medium uppercase tracking-[0.22em] text-primary backdrop-blur-sm">
                      {article.category}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col p-5 md:p-6">
                    <Meta date={article.date} author={article.author} />
                    <h3
                      className="mt-3 line-clamp-2 font-heading font-light leading-tight text-black transition-colors duration-500 group-hover:text-primary"
                      style={{ fontSize: '1.15rem', letterSpacing: '-0.005em' }}
                    >
                      {article.title}
                    </h3>
                    {article.excerpt && (
                      <p className="mt-3 line-clamp-3 text-[13.5px] leading-[1.7] text-black/60">
                        {article.excerpt}
                      </p>
                    )}
                    <span className="mt-auto pt-4 font-heading text-[11px] font-medium uppercase tracking-[0.24em] text-primary">
                      Read the story
                    </span>
                  </div>
                </Link>
              </motion.article>
            ))}
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
