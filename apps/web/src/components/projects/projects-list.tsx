'use client';

import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { useMemo, useState } from 'react';
import { Sprout } from 'lucide-react';

import { EmptyState } from '@/components/ui/empty-state';

import { isLocalSupabaseUrl } from '../leadership/is-local-supabase-url';
import type { Project, ProjectStatus } from './projects-content';

/** "All" first, then every unique category name from the loaded set. */
type CategoryFilter = 'All' | string;

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, delay: i * 0.08, ease },
  }),
};

const statusStyles: Record<ProjectStatus, string> = {
  Active: 'border-success/40 bg-success/10 text-success',
  Ongoing: 'border-primary/40 bg-primary/10 text-primary',
  Planning: 'border-black/20 bg-black/5 text-black/60',
  Fundraising: 'border-warning/40 bg-warning/10 text-warning',
  Completed: 'border-black/15 bg-white text-black/55',
};

interface Props {
  readonly projects: readonly Project[];
  /** Category names to render as filter chips. "All" is always prepended. */
  readonly categories: readonly string[];
}

export function ProjectsList({ projects, categories }: Props) {
  const [filter, setFilter] = useState<CategoryFilter>('All');

  const filterOptions = useMemo<readonly string[]>(() => ['All', ...categories], [categories]);

  const list = useMemo(
    () => (filter === 'All' ? projects : projects.filter((p) => p.categories.includes(filter))),
    [projects, filter],
  );

  if (projects.length === 0) {
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
            icon={Sprout}
            heading="No projects to show yet"
            body="The next round of alumni projects is being staged. Cards will populate here as soon as each one is live in the CMS."
            cta={{ label: 'See the strategic plan', href: '/strategic-plan' }}
          />
        </div>
      </section>
    );
  }

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
              The Pipeline
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
              Every mission, <span className="italic text-primary">on the record.</span>
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
            Filter by focus area. Click any project to see the ledger, the milestones, and how to
            help.
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
          {filterOptions.map((c) => {
            const active = filter === c;
            const count =
              c === 'All'
                ? projects.length
                : projects.filter((p) => p.categories.includes(c)).length;
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
          <AnimatePresence mode="popLayout">
            {list.length === 0 ? (
              <motion.p
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-xs border border-dashed border-black/15 bg-white p-10 text-center text-sm text-black/50"
              >
                No projects in this category yet.
              </motion.p>
            ) : (
              <motion.div
                key="grid"
                layout
                className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:gap-6 lg:grid-cols-3"
              >
                {list.map((project, i) => (
                  <motion.div
                    key={project.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 12 }}
                    transition={{ duration: 0.5, delay: 0.05 + (i % 6) * 0.06, ease }}
                  >
                    <ProjectCard project={project} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

function ProjectCard({ project }: { readonly project: Project }) {
  const pct =
    project.funding && project.funding.target > 0
      ? Math.min(100, Math.round((project.funding.raised / project.funding.target) * 100))
      : null;

  return (
    <Link
      href={`/projects/${project.slug}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-xs border border-black/8 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-500 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_18px_40px_-12px_rgba(139,21,51,0.16)]"
    >
      <div className="relative aspect-3/2 overflow-hidden">
        <Image
          src={project.image}
          alt={project.title}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          quality={75}
          unoptimized={isLocalSupabaseUrl(project.image)}
          className="object-cover object-top transition-transform duration-1000 group-hover:scale-105"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.5) 100%)',
          }}
        />
        <span
          className={`absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-xs border px-2.5 py-1 font-heading text-[10px] font-medium uppercase tracking-[0.22em] backdrop-blur-sm ${statusStyles[project.status]}`}
        >
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
          {project.status}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5 md:p-6">
        <p className="font-heading text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
          {project.category}
        </p>
        <h3
          className="mt-2 font-heading font-light leading-tight text-black transition-colors duration-500 group-hover:text-primary"
          style={{ fontSize: '1.15rem', letterSpacing: '-0.005em' }}
        >
          {project.title}
        </h3>
        <p className="mt-3 line-clamp-3 text-[13.5px] leading-[1.65] text-black/60">
          {project.shortDescription}
        </p>

        {pct !== null && (
          <div className="mt-5">
            <div className="flex items-center justify-between text-[11px] text-black/55">
              <span className="font-heading font-medium uppercase tracking-[0.22em] text-primary">
                {pct}% funded
              </span>
              <span className="tabular-nums">
                {formatMoney(project.funding!.raised, project.funding!.currency)} /{' '}
                {formatMoney(project.funding!.target, project.funding!.currency)}
              </span>
            </div>
            <div className="mt-2 h-1 w-full overflow-hidden rounded-xs bg-black/8">
              <div
                aria-hidden
                className="h-full bg-primary transition-[width] duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-5 flex items-center justify-between border-t border-black/8 pt-4">
          <p className="text-[11px] text-black/50">Since {project.startedOn}</p>
          <span
            aria-hidden
            className="inline-flex items-center gap-1 text-[12.5px] font-medium text-primary transition-transform duration-300 group-hover:translate-x-1"
          >
            Open <span aria-hidden>→</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

export function formatMoney(value: number, currency: string) {
  if (value >= 1_000_000) return `${currency} ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${currency} ${(value / 1_000).toFixed(0)}K`;
  return `${currency} ${value.toString()}`;
}
