'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import { Sprout } from 'lucide-react';

import { EmptyState } from '@/components/ui/empty-state';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, delay: i * 0.1, ease },
  }),
};

type Project = {
  readonly title: string;
  readonly category: string;
  readonly body: string;
  readonly image: string;
  readonly slug: string;
};

interface ProjectsProps {
  readonly projects: readonly Project[];
}

export function Projects({ projects }: ProjectsProps) {
  return (
    <section className="relative overflow-hidden py-20 text-black md:py-24 bg-black/5">
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
              Our Projects
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
              Building tomorrow, <span className="italic text-primary">together.</span>
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
            <ViewMoreLink href="/projects">View all projects</ViewMoreLink>
          </motion.div>
        </div>

        {projects.length === 0 ? (
          <div className="mx-auto mt-12 max-w-3xl md:mt-16">
            <EmptyState
              icon={Sprout}
              heading="No live projects to show"
              body="We're staging the next round of missions. As soon as the first project is live the cards will populate here."
              cta={{ label: 'See the strategic plan', href: '/strategic-plan' }}
            />
          </div>
        ) : (
          <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 md:mt-16 md:gap-6 lg:grid-cols-4">
            {projects.map((project, i) => (
              <motion.div
                key={project.slug}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.75, delay: 0.15 + i * 0.1, ease }}
              >
                <ProjectCard project={project} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ProjectCard({ project }: { readonly project: Project }) {
  return (
    <Link
      href={`/projects/${project.slug}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-xs border border-black/8 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-500 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_18px_40px_-12px_rgba(139,21,51,0.18)]"
    >
      <div className="relative aspect-3/2 overflow-hidden">
        <Image
          src={project.image}
          alt={project.title}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          quality={75}
          className="object-cover object-top transition-transform duration-1000 group-hover:scale-105"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.5) 100%)',
          }}
        />
      </div>

      <div className="flex flex-1 flex-col p-5 md:p-6">
        <p className="font-heading text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
          {project.category}
        </p>
        <h3
          className="mt-2 font-heading font-light leading-tight text-black transition-colors duration-500 group-hover:text-primary"
          style={{ fontSize: '1.15rem', letterSpacing: '-0.01em' }}
        >
          {project.title}
        </h3>
        <p className="mt-3 line-clamp-3 text-sm leading-[1.6] text-black/60">{project.body}</p>
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
