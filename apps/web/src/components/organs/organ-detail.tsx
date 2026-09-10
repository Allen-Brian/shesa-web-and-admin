'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, MapPin, Phone, Globe, Users } from 'lucide-react';
import { useState } from 'react';

import {
  LeaderProfileProvider,
  useLeaderProfile,
} from '@/components/leadership/leader-profile-modal';
import { hasProfile, type LeaderProfile } from '@/components/leadership/leader-profile';

import type { OrganDetail, OrganLeader, OrganPhoto } from './organs-content';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const PLACEHOLDER_PHOTO = '/president_one.jpg';

/**
 * One branch, in full.
 *
 * Assembled from what the Highlight Series asks each branch to submit:
 * the branch's own description and member count, its top achievements,
 * the group pictures, and a profile of whoever leads it.
 *
 * The president's profile is not stored here — it lives on the leader
 * record that the Leadership page already renders, and this page reads
 * the same row. One biography, two places it shows.
 */
export function OrganDetailView({ detail }: { readonly detail: OrganDetail }) {
  return (
    <LeaderProfileProvider>
      <OrganDetailBody detail={detail} />
    </LeaderProfileProvider>
  );
}

function OrganDetailBody({ detail }: { readonly detail: OrganDetail }) {
  const { organ, sectorName, leaders, albumTitle, photos } = detail;

  return (
    <article className="relative bg-white pb-24 pt-32 md:pb-32 md:pt-40">
      <div className="mx-auto max-w-350 px-5 md:px-8 lg:px-12">
        <Link
          href="/organs"
          className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-black/50 transition-colors hover:text-primary"
        >
          <span aria-hidden>←</span> All organs
        </Link>

        {/* ── Identity ─────────────────────────────────────────────── */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease }}
          className="mt-10 flex flex-col gap-8 md:flex-row md:items-start md:justify-between"
        >
          <div className="flex items-start gap-5">
            {organ.logoUrl && (
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xs border border-black/8 bg-black/5 md:h-24 md:w-24">
                <Image
                  src={organ.logoUrl}
                  alt={organ.name}
                  fill
                  sizes="96px"
                  quality={80}
                  className="object-contain"
                />
              </div>
            )}

            <div className="min-w-0">
              {sectorName && (
                <p className="font-heading text-[11px] font-medium uppercase tracking-[0.28em] text-primary">
                  {sectorName}
                </p>
              )}
              <h1
                className="mt-3 font-heading font-thin leading-[1.05] text-black"
                style={{ fontSize: 'clamp(1.9rem, 4.2vw, 3.4rem)', letterSpacing: '-0.02em' }}
              >
                {organ.name}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13.5px] text-black/60">
                {(organ.location || organ.country) && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" aria-hidden />
                    {[organ.location, organ.country].filter(Boolean).join(', ')}
                  </span>
                )}
                {organ.foundedYear && <span>Established {organ.foundedYear}</span>}
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" aria-hidden />
                  <span className="tabular-nums">{organ.memberCount.toLocaleString()}</span>
                  {organ.memberCount === 1 ? 'member' : 'members'}
                </span>
              </div>
            </div>
          </div>

          {(organ.contactEmail || organ.contactPhone || organ.websiteUrl) && (
            <div className="flex shrink-0 flex-wrap items-center gap-2.5">
              {organ.contactEmail && (
                <a
                  href={`mailto:${organ.contactEmail}`}
                  className="inline-flex items-center gap-2 rounded-xs border border-black/15 px-4 py-2.5 text-[13px] tracking-wide text-black/70 transition-colors hover:border-primary hover:text-primary"
                >
                  <Mail className="h-3.5 w-3.5" aria-hidden />
                  Email
                </a>
              )}
              {organ.contactPhone && (
                <a
                  href={`tel:${organ.contactPhone.replace(/[^\d+]/g, '')}`}
                  className="inline-flex items-center gap-2 rounded-xs border border-black/15 px-4 py-2.5 text-[13px] tracking-wide text-black/70 transition-colors hover:border-primary hover:text-primary"
                >
                  <Phone className="h-3.5 w-3.5" aria-hidden />
                  Call
                </a>
              )}
              {organ.websiteUrl && (
                <a
                  href={organ.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xs border border-black/15 px-4 py-2.5 text-[13px] tracking-wide text-black/70 transition-colors hover:border-primary hover:text-primary"
                >
                  <Globe className="h-3.5 w-3.5" aria-hidden />
                  Website
                </a>
              )}
            </div>
          )}
        </motion.header>

        {organ.description && (
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease }}
            className="mt-10 max-w-3xl whitespace-pre-line text-[16px] leading-[1.85] text-black/70"
          >
            {organ.description}
          </motion.p>
        )}

        {/* ── Achievements ─────────────────────────────────────────── */}
        {organ.achievements.length > 0 && (
          <section className="mt-16 md:mt-20">
            <p className="font-heading text-sm font-medium uppercase tracking-[0.28em] text-primary">
              Achievements
            </p>

            {/* Numbered because this list genuinely is ranked — the
                submission asks for a branch's *top* three, in order. */}
            <ol className="mt-8 grid gap-4 md:grid-cols-3 md:gap-5">
              {organ.achievements.map((item, i) => (
                <motion.li
                  key={item}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.6, delay: i * 0.08, ease }}
                  className="rounded-xs border border-black/8 bg-black/2 p-6"
                >
                  <span className="font-heading text-[11px] font-medium uppercase tracking-[0.24em] text-primary tabular-nums">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p className="mt-3 text-[14.5px] leading-[1.7] text-black/75">{item}</p>
                </motion.li>
              ))}
            </ol>
          </section>
        )}

        {/* ── Leadership ───────────────────────────────────────────── */}
        {leaders.length > 0 && (
          <section className="mt-16 md:mt-20">
            <p className="font-heading text-sm font-medium uppercase tracking-[0.28em] text-primary">
              Leadership
            </p>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {leaders.map((leader) => (
                <OrganLeaderCard key={leader.id} leader={leader} organName={organ.name} />
              ))}
            </div>
          </section>
        )}

        {/* ── Album ────────────────────────────────────────────────── */}
        {photos.length > 0 && (
          <section className="mt-16 md:mt-20">
            <p className="font-heading text-sm font-medium uppercase tracking-[0.28em] text-primary">
              {albumTitle ?? 'Gallery'}
            </p>
            <OrganAlbum photos={photos} organName={organ.name} />
          </section>
        )}
      </div>
    </article>
  );
}

function OrganLeaderCard({
  leader,
  organName,
}: {
  readonly leader: OrganLeader;
  readonly organName: string;
}) {
  const { open } = useLeaderProfile();

  const profile: LeaderProfile = {
    name: leader.name,
    role: `${leader.role} · ${organName}`,
    photo: leader.photo ?? PLACEHOLDER_PHOTO,
    profession: leader.profession,
    bio: leader.bio,
    email: leader.email,
    phone: leader.phone,
  };
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
            'aria-label': `Read ${leader.name}'s profile`,
          }
        : {})}
      className={`flex items-center gap-4 rounded-xs border border-black/8 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${
        openable
          ? 'cursor-pointer transition-all duration-500 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_18px_40px_-12px_rgba(139,21,51,0.16)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
          : ''
      }`}
    >
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xs bg-black/5">
        <Image
          src={leader.photo ?? PLACEHOLDER_PHOTO}
          alt={leader.name}
          fill
          sizes="64px"
          quality={75}
          className="object-cover object-top"
        />
      </div>
      <div className="min-w-0">
        <p className="font-heading text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
          {leader.role}
        </p>
        <h3 className="mt-1.5 font-heading text-[15px] font-light leading-tight text-black">
          {leader.name}
        </h3>
        {leader.profession && (
          <p className="mt-1 truncate text-[12.5px] text-black/55">{leader.profession}</p>
        )}
      </div>
    </article>
  );
}

/**
 * The group pictures.
 *
 * Deliberately not the site's full lightbox: that component belongs to
 * the Gallery page and carries its album navigation with it. Here a
 * picture only has to get bigger, so clicking one swaps it into the lead
 * frame rather than opening anything.
 */
function OrganAlbum({
  photos,
  organName,
}: {
  readonly photos: readonly OrganPhoto[];
  readonly organName: string;
}) {
  const [leadIndex, setLeadIndex] = useState(0);
  const lead = photos[leadIndex] ?? photos[0]!;

  return (
    <div className="mt-8">
      <motion.div
        key={lead.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease }}
        className="relative aspect-3/2 w-full overflow-hidden rounded-xs bg-black/5"
      >
        <Image
          src={lead.src}
          alt={lead.alt ?? `${organName} members`}
          fill
          sizes="(min-width: 1024px) 70vw, 100vw"
          quality={82}
          priority
          className="object-cover"
        />
      </motion.div>

      {photos.length > 1 && (
        <div
          className="mt-3 flex gap-3 overflow-x-auto pb-2"
          style={{ scrollbarWidth: 'none' }}
          /* Lenis swallows a horizontal wheel gesture over a nested
             scroller unless it is told not to. Touch already passes
             through while it is running. */
          data-lenis-prevent-wheel
        >
          {photos.map((photo, i) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setLeadIndex(i)}
              aria-label={`Show picture ${i + 1} of ${photos.length}`}
              aria-current={i === leadIndex}
              className={`relative aspect-3/2 w-32 shrink-0 overflow-hidden rounded-xs transition-all duration-300 md:w-40 ${
                i === leadIndex ? 'ring-2 ring-primary' : 'opacity-70 hover:opacity-100'
              }`}
            >
              <Image
                src={photo.src}
                alt=""
                fill
                sizes="160px"
                quality={60}
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
