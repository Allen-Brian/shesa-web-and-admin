'use client';

import Image from 'next/image';

import { isLocalSupabaseUrl } from './is-local-supabase-url';
import { hasProfile, type LeaderProfile } from './leader-profile';
import { useLeaderProfile } from './leader-profile-modal';
import { motion, type Variants } from 'framer-motion';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, delay: i * 0.06, ease },
  }),
};

export type BranchPresident = {
  readonly name: string;
  readonly branch: string;
  readonly city: string;
  readonly photo: string;
  readonly slug: string;
  /** Profile, when an editor has written one. See `leader-profile`. */
  readonly profession?: string | null;
  readonly bio?: string | null;
  readonly email?: string | null;
  readonly phone?: string | null;
  /** The branch's own page, when it has one. */
  readonly organHref?: string | null;
  /**
   * `President` or `Vice President`. Shown on the card because a branch
   * may now list both, and two cards under one branch name with no title
   * would read as a mistake.
   */
  readonly role: string;
};

interface BranchPresidentsProps {
  /** Live list from the CMS. Empty → the whole section short-circuits. */
  readonly presidents: readonly BranchPresident[];
}

export function BranchPresidents({ presidents }: BranchPresidentsProps) {
  if (presidents.length === 0) return null;
  return (
    <section
      className="relative overflow-hidden py-20 text-black md:py-28"
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
              National Branches
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
              The chairs <span className="italic text-primary">at home.</span>
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
            The presidents of each branch across Cameroon, running homecomings, hosting reunions,
            and keeping the movement alive on the ground.
          </motion.p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 md:mt-16 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
          {presidents.map((p, i) => (
            <motion.div
              key={p.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.7, delay: 0.05 + (i % 8) * 0.06, ease }}
            >
              <BranchCard president={p} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function toProfile(president: BranchPresident): LeaderProfile {
  return {
    name: president.name,
    // "President · Buea Branch" rather than either half alone: in the
    // modal the card's own heading is gone, so the role has to carry
    // both what they do and where.
    role: `${president.role} · ${president.branch}`,
    location: president.city || null,
    photo: president.photo,
    profession: president.profession ?? null,
    bio: president.bio ?? null,
    email: president.email ?? null,
    phone: president.phone ?? null,
    organHref: president.organHref ?? null,
    organName: president.branch,
  };
}

function BranchCard({ president }: { readonly president: BranchPresident }) {
  const { open } = useLeaderProfile();
  const profile = toProfile(president);
  const openable = hasProfile(profile);

  return (
    <article
      {...(openable
        ? {
            role: 'button',
            tabIndex: 0,
            onClick: () => open(profile),
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                open(profile);
              }
            },
            'aria-label': `Read ${president.name}'s profile`,
          }
        : {})}
      className={`relative flex h-full flex-col overflow-hidden rounded-xs border border-black/8 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${
        openable
          ? 'cursor-pointer transition-all duration-500 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_18px_40px_-12px_rgba(139,21,51,0.16)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
          : ''
      }`}
    >
      {/* 4/5 to match the main organ's portraits — at 4/3 these sat
          noticeably shorter than the executive's on the same page. */}
      <div className="relative aspect-4/5 overflow-hidden">
        <Image
          src={president.photo}
          alt={president.name}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          quality={75}
          unoptimized={isLocalSupabaseUrl(president.photo)}
          className="object-cover object-top"
        />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="font-heading text-[10px] font-semibold uppercase leading-relaxed tracking-[0.22em] text-primary">
          {president.branch}
        </p>
        <h3
          className="mt-2 font-heading font-light leading-tight text-black"
          style={{ fontSize: '1.1rem', letterSpacing: '-0.005em' }}
        >
          {president.name}
        </h3>
        <p className="mt-1 text-[11.5px] font-medium uppercase tracking-[0.14em] text-black/45">
          {president.role}
        </p>
        <p className="mt-2 text-[12.5px] leading-snug text-black/55">{president.city}</p>
      </div>
    </article>
  );
}
