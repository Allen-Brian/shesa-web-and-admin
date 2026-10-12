'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import { Users } from 'lucide-react';

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

type Leader = {
  readonly name: string;
  readonly role: string;
  readonly location: string;
  readonly photo: string;
  readonly slug: string;
};

interface LeadershipProps {
  readonly leaders: readonly Leader[];
}

export function Leadership({ leaders }: LeadershipProps) {
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
              The Leadership
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
              The stewards of the <span className="italic text-primary">vision.</span>
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
            <ViewMoreLink href="/leadership">Meet everyone</ViewMoreLink>
          </motion.div>
        </div>

        {leaders.length === 0 ? (
          <div className="mx-auto mt-12 max-w-3xl md:mt-16">
            <EmptyState
              icon={Users}
              heading="Leadership roster coming soon"
              body="The SHESA Executive Committee and branch presidents will appear here once the CMS has been populated."
              cta={{ label: 'How we are structured', href: '/organs' }}
            />
          </div>
        ) : (
          /* Five across on a wide screen — the strip now carries the five
             principal officers rather than the first four by sort order. */
          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 md:mt-16 md:gap-8 lg:grid-cols-3 xl:grid-cols-5">
            {leaders.map((leader, i) => (
              <motion.div
                key={leader.slug}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.75, delay: 0.15 + i * 0.1, ease }}
              >
                <LeaderCard leader={leader} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function LeaderCard({ leader }: { readonly leader: Leader }) {
  return (
    /* Lands on this person's card on the leadership page. There is no
       /leadership/{id} route and there should not be: the CMS stores
       only what this card already shows, so a detail page would be an
       empty room. */
    <Link
      href={`/leadership#leader-${leader.slug}`}
      className="group relative block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
    >
      <div className="relative aspect-4/5 overflow-hidden rounded-xs">
        <Image
          src={leader.photo}
          alt={leader.name}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          quality={75}
          className="object-cover object-top transition-transform duration-1000 group-hover:scale-105"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 transition-colors duration-500"
          style={{
            background: 'linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.65) 100%)',
          }}
        />

        <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
          <p className="font-heading text-[10px] font-medium uppercase tracking-[0.28em] text-white/75">
            {leader.role}
          </p>
          <h3
            className="mt-1.5 font-heading font-light leading-tight text-white"
            style={{ fontSize: '1.15rem', letterSpacing: '-0.01em' }}
          >
            {leader.name}
          </h3>
          <p className="mt-1 text-[11.5px] tracking-wide text-white/70">{leader.location}</p>
        </div>

        <span
          aria-hidden
          className="pointer-events-none absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-xs border border-white/40 bg-white/10 text-white opacity-0 backdrop-blur-sm transition-all duration-500 group-hover:translate-x-1 group-hover:opacity-100"
        >
          →
        </span>
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
