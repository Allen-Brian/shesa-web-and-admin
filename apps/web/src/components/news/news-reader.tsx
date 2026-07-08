'use client';

import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';

import { articles, type Article } from './data';

type Tab = 'latest' | 'popular';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

export function NewsReader() {
  const [tab, setTab] = useState<Tab>('latest');
  const [selectedId, setSelectedId] = useState<string>(articles[0]?.id ?? '');

  const list = useMemo(() => {
    if (tab === 'popular') return articles.filter((a) => a.popular);
    return articles;
  }, [tab]);

  const selected = useMemo(
    () => articles.find((a) => a.id === selectedId) ?? articles[0],
    [selectedId],
  );

  if (!selected) return null;

  return (
    <section className="relative bg-white pb-24 md:pb-32">
      <div className="mx-auto max-w-350 px-5 md:px-8 lg:px-12">
        <div className="grid gap-10 md:grid-cols-12 md:gap-12 lg:gap-16">
          <aside className="md:col-span-4">
            <TabBar tab={tab} onChange={setTab} />

            <ul className="mt-6 flex flex-col divide-y divide-black/8">
              {list.map((article) => (
                <li key={article.id}>
                  <ArticlePreview
                    article={article}
                    active={article.id === selectedId}
                    onSelect={() => setSelectedId(article.id)}
                  />
                </li>
              ))}
            </ul>
          </aside>

          <div className="md:col-span-8">
            <AnimatePresence mode="wait">
              <motion.article
                key={selected.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.45, ease }}
              >
                <ArticleView article={selected} />
              </motion.article>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

function TabBar({ tab, onChange }: { readonly tab: Tab; readonly onChange: (tab: Tab) => void }) {
  return (
    <div className="border-b border-black/10">
      <div className="flex items-center gap-6">
        <TabButton label="Latest" active={tab === 'latest'} onClick={() => onChange('latest')} />
        <TabButton label="Popular" active={tab === 'popular'} onClick={() => onChange('popular')} />
      </div>
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  readonly label: string;
  readonly active: boolean;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative -mb-px pb-3 font-heading text-[15px] transition-colors ${
        active ? 'font-medium text-primary' : 'font-light text-black/50 hover:text-black'
      }`}
    >
      {label}
      {active && (
        <motion.span
          layoutId="news-tab-underline"
          aria-hidden
          className="absolute inset-x-0 -bottom-px h-0.5 bg-primary"
        />
      )}
    </button>
  );
}

function ArticlePreview({
  article,
  active,
  onSelect,
}: {
  readonly article: Article;
  readonly active: boolean;
  readonly onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active}
      className={`group grid w-full grid-cols-[80px_1fr] gap-4 py-5 text-left transition-colors ${
        active ? 'text-black' : 'text-black/85'
      }`}
    >
      <div className="relative aspect-square overflow-hidden rounded-xs">
        <Image
          src={article.image}
          alt=""
          fill
          sizes="80px"
          quality={75}
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        {active && <span aria-hidden className="absolute inset-0 border-2 border-primary" />}
      </div>

      <div className="min-w-0">
        <p className="font-heading text-[10px] font-medium uppercase tracking-[0.24em] text-black/45">
          {article.relativeDate}
        </p>
        <h3
          className={`mt-1.5 font-heading font-light leading-snug transition-colors ${
            active ? 'text-primary' : 'text-black group-hover:text-primary'
          }`}
          style={{ fontSize: '14.5px', letterSpacing: '-0.005em' }}
        >
          {article.title}
        </h3>
        <p className="mt-2 font-heading text-[11.5px] font-medium text-primary">
          {article.author.name}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {article.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-xs border border-black/12 px-2 py-0.5 font-heading text-[9.5px] font-medium uppercase tracking-[0.14em] text-black/55"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}

function ArticleView({ article }: { readonly article: Article }) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/10 pb-6">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full">
            <Image
              src={article.author.avatar}
              alt={article.author.name}
              fill
              sizes="40px"
              quality={75}
              className="object-cover object-top"
            />
          </div>
          <div>
            <p className="font-heading text-[11px] font-medium uppercase tracking-[0.22em] text-black/55">
              By
            </p>
            <p className="font-heading text-sm font-medium text-black">
              {article.author.name}
              <span className="ml-2 font-light text-black/50">· {article.relativeDate}</span>
            </p>
          </div>
          <div className="ml-4 hidden flex-wrap gap-1.5 sm:flex">
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-xs border border-black/12 px-2 py-0.5 font-heading text-[10px] font-medium uppercase tracking-[0.16em] text-black/55"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <ShareButton title={article.title} />
      </div>

      <h2
        className="mt-8 font-heading font-thin leading-[1.05] text-black"
        style={{
          fontSize: 'clamp(1.85rem, 3.6vw, 3rem)',
          letterSpacing: '-0.015em',
        }}
      >
        {article.title}
      </h2>

      <p className="mt-4 font-heading text-[11px] font-medium uppercase tracking-[0.24em] text-primary">
        {article.category} · {article.date}
      </p>

      <div className="relative mt-8 aspect-[16/9] w-full overflow-hidden rounded-xs md:aspect-[16/8]">
        <Image
          src={article.image}
          alt={article.title}
          fill
          priority
          sizes="(min-width: 768px) 66vw, 100vw"
          quality={75}
          className="object-cover"
        />
      </div>

      <div className="mt-10 max-w-3xl space-y-6 text-[16px] leading-[1.85] text-black/80">
        {article.body.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>
    </div>
  );
}

function ShareButton({ title }: { readonly title: string }) {
  const [open, setOpen] = useState(false);

  const share = async () => {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title, url: window.location.href });
        return;
      } catch {
        // fall through to menu
      }
    }
    setOpen((o) => !o);
  };

  const copy = async () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(window.location.href);
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={share}
        className="group relative inline-flex items-center gap-2 rounded-xs bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-10px_rgba(139,21,51,0.5)]"
      >
        <span>Share</span>
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
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease }}
            className="absolute right-0 top-full z-10 mt-2 w-48 overflow-hidden rounded-xs border border-black/10 bg-white shadow-[0_18px_40px_-12px_rgba(0,0,0,0.2)]"
          >
            <button
              type="button"
              onClick={copy}
              className="block w-full px-4 py-2.5 text-left text-sm text-black transition-colors hover:bg-primary/5 hover:text-primary"
            >
              Copy link
            </button>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}`}
              target="_blank"
              rel="noreferrer noopener"
              className="block w-full px-4 py-2.5 text-left text-sm text-black transition-colors hover:bg-primary/5 hover:text-primary"
            >
              Share on X
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
              target="_blank"
              rel="noreferrer noopener"
              className="block w-full px-4 py-2.5 text-left text-sm text-black transition-colors hover:bg-primary/5 hover:text-primary"
            >
              Share on LinkedIn
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
