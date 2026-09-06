'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';

import { isLocalSupabaseUrl } from '../leadership/is-local-supabase-url';
import { formatMoney } from './projects-list';
import type { Project } from './projects-content';

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

interface Props {
  readonly project: Project;
  /**
   * The contribute form, when this project has an open charge. Passed as a
   * node rather than data so the panel stays one component shared with
   * events and anything else that grows a charge later.
   */
  readonly contribute?: React.ReactNode;
  /**
   * Optional related-project list, the server page pre-picks up to
   * three same-category siblings so this component doesn't have to
   * hold a reference to the full CMS.
   */
  readonly related?: readonly Project[];
}

export function ProjectDetail({ project, related = [], contribute }: Props) {
  return (
    <>
      <ProjectHero project={project} />
      <ProjectBody project={project} contribute={contribute} />
      {project.milestones && project.milestones.length > 0 && (
        <MilestonesSection milestones={project.milestones} />
      )}
      {related.length > 0 && <RelatedProjects projects={related} />}
    </>
  );
}

function ProjectHero({ project }: { readonly project: Project }) {
  return (
    <section
      data-nav-dark
      className="relative isolate flex min-h-[62svh] w-full items-end overflow-hidden bg-black pb-16 pt-32 text-white md:pt-40"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-20 overflow-hidden">
        <Image
          src={project.image}
          alt=""
          fill
          priority
          quality={45}
          sizes="100vw"
          unoptimized={isLocalSupabaseUrl(project.image)}
          className="object-cover opacity-30"
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
          className="mb-8 text-[11px] uppercase tracking-[0.28em] text-white/60"
        >
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 transition-colors hover:text-white"
          >
            <span aria-hidden>←</span> Back to projects
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
          {project.category} · {project.status}
        </motion.p>

        <motion.h1
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={revealParent}
          className="mt-6 font-heading font-thin leading-[1.05] text-white"
          style={{
            fontSize: 'clamp(2.25rem, 5.2vw, 4.75rem)',
            letterSpacing: '-0.02em',
          }}
        >
          <span className="block overflow-hidden pb-1 md:pb-2">
            <motion.span variants={revealLine} className="block">
              {project.title}
            </motion.span>
          </span>
        </motion.h1>

        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={fadeUp}
          custom={4}
          className="mt-6 max-w-2xl text-[15px] leading-[1.8] text-white/80 md:text-[17px]"
        >
          {project.shortDescription}
        </motion.p>
      </div>
    </section>
  );
}

function ProjectBody({
  project,
  contribute,
}: {
  readonly project: Project;
  readonly contribute?: React.ReactNode;
}) {
  const pct =
    project.funding && project.funding.target > 0
      ? Math.min(100, Math.round((project.funding.raised / project.funding.target) * 100))
      : null;

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
              About this project
            </motion.p>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.35 }}
              variants={fadeUp}
              custom={1}
              className="mt-6 space-y-6 text-[16px] leading-[1.85] text-black/80"
            >
              {project.description.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </motion.div>

            {project.impact && project.impact.length > 0 && (
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.5 }}
                variants={fadeUp}
                custom={2}
                className="mt-12"
              >
                <p className="font-heading text-[11px] font-medium uppercase tracking-[0.28em] text-primary">
                  Impact so far
                </p>
                <div className="mt-6 grid gap-8 sm:grid-cols-3 md:gap-10">
                  {project.impact.map((it) => (
                    <div key={it.label}>
                      <span
                        className="font-heading font-thin leading-none tracking-tight tabular-nums text-black"
                        style={{ fontSize: 'clamp(2rem, 3.4vw, 3rem)' }}
                      >
                        {it.value}
                      </span>
                      <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.24em] text-black/55">
                        {it.label}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          <aside className="md:col-span-4">
            <div className="sticky top-28 space-y-6">
              <div className="rounded-xs border border-black/10 bg-white p-6">
                <p className="font-heading text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
                  Quick facts
                </p>
                <ul className="mt-5 space-y-4 text-[13.5px] text-black/70">
                  <li className="flex items-start gap-3">
                    <TagIcon />
                    <span>
                      <span className="font-heading font-medium text-black">
                        {project.category}
                      </span>
                      <br />
                      <span className="text-black/50">Focus area</span>
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <PinIcon />
                    <span>
                      <span className="font-heading font-medium text-black">
                        {project.location}
                      </span>
                      <br />
                      <span className="text-black/50">Where it runs</span>
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <UserIcon />
                    <span>
                      <span className="font-heading font-medium text-black">{project.lead}</span>
                      <br />
                      <span className="text-black/50">Lead</span>
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CalendarIcon />
                    <span>
                      <span className="font-heading font-medium text-black">
                        {project.startedOn}
                      </span>
                      <br />
                      <span className="text-black/50">Started</span>
                    </span>
                  </li>
                </ul>
              </div>

              {pct !== null && (
                <div className="rounded-xs border border-black/10 bg-white p-6">
                  <p className="font-heading text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
                    Funding
                  </p>
                  <div className="mt-4 flex items-baseline justify-between gap-3">
                    <span
                      className="font-heading font-thin leading-none text-black tabular-nums"
                      style={{ fontSize: 'clamp(1.75rem, 2.6vw, 2.25rem)' }}
                    >
                      {pct}%
                    </span>
                    <span className="text-[12px] text-black/50">of goal</span>
                  </div>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-xs bg-black/8">
                    <div
                      aria-hidden
                      className="h-full bg-primary transition-[width] duration-1000"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-3 text-[12px] tabular-nums text-black/60">
                    <span className="font-medium text-black">
                      {formatMoney(project.funding!.raised, project.funding!.currency)}
                    </span>{' '}
                    raised / {formatMoney(project.funding!.target, project.funding!.currency)} goal
                  </p>
                </div>
              )}

              {/* The Support button used to link to /projects/[slug]/support,
                  a route that does not exist — a dead link on every project
                  page. It is replaced by the real contribute form, which
                  renders only when this project has an open charge. When it
                  has none there is nothing to click, which is the honest
                  rendering of "not accepting contributions". */}
              <div className="flex flex-col gap-3 rounded-xs border border-black/10 bg-white p-6">
                {contribute}
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 rounded-xs border border-black/15 bg-white px-5 py-3 text-[13.5px] font-medium tracking-wide text-black transition-colors hover:border-primary hover:text-primary"
                >
                  Talk to the team
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function MilestonesSection({
  milestones,
}: {
  readonly milestones: readonly import('./projects-content').ProjectMilestone[];
}) {
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
          The Ledger
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
          Milestones, <span className="italic text-primary">on the record.</span>
        </motion.h2>

        <div className="mt-12 md:mt-16">
          <ol className="relative">
            <span
              aria-hidden
              className="absolute left-1.75 top-2 bottom-2 hidden w-px bg-black/12 md:block"
            />
            <div className="flex flex-col gap-4 md:gap-2">
              {milestones.map((m, i) => (
                <motion.li
                  key={`${m.date}-${m.title}`}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.35 }}
                  transition={{ duration: 0.6, delay: 0.05 + i * 0.05, ease }}
                  className="relative grid grid-cols-1 gap-3 md:grid-cols-[24px_1fr_140px] md:items-start md:gap-6"
                >
                  <span
                    aria-hidden
                    className={`absolute left-0 top-2 grid h-4 w-4 place-items-center rounded-full border-2 ${
                      m.done ? 'border-primary bg-primary' : 'border-primary bg-white'
                    }`}
                  >
                    {m.done && (
                      <svg
                        viewBox="0 0 24 24"
                        className="h-2.5 w-2.5 text-white"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m6 12 4 4 8-10" />
                      </svg>
                    )}
                  </span>
                  <div className="pl-8 md:col-start-2 md:pl-0">
                    <h3
                      className="font-heading font-light leading-tight text-black"
                      style={{ fontSize: '1.05rem', letterSpacing: '-0.005em' }}
                    >
                      {m.title}
                    </h3>
                    {m.body && (
                      <p className="mt-1.5 max-w-2xl text-[14px] leading-[1.7] text-black/60">
                        {m.body}
                      </p>
                    )}
                  </div>
                  <p className="pl-8 font-heading text-xs font-medium uppercase tracking-[0.24em] text-primary md:col-start-3 md:mt-1.5 md:pl-0 md:text-right">
                    {m.date}
                  </p>
                </motion.li>
              ))}
            </div>
          </ol>
        </div>
      </div>
    </section>
  );
}

function RelatedProjects({ projects }: { readonly projects: readonly Project[] }) {
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
          Also in the pipeline
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
          More of what <span className="italic text-primary">we're building.</span>
        </motion.h2>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 md:mt-14 md:gap-6 lg:grid-cols-3">
          {projects.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.65, delay: 0.1 + i * 0.08, ease }}
            >
              <RelatedCard project={p} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RelatedCard({ project }: { readonly project: Project }) {
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
      </div>
      <div className="flex flex-1 flex-col p-5 md:p-6">
        <p className="font-heading text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
          {project.category}
        </p>
        <h3
          className="mt-2 font-heading font-light leading-tight text-black transition-colors duration-500 group-hover:text-primary"
          style={{ fontSize: '1.05rem', letterSpacing: '-0.005em' }}
        >
          {project.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-[13px] leading-[1.6] text-black/55">
          {project.shortDescription}
        </p>
      </div>
    </Link>
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

function UserIcon() {
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
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
