'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';

import type { PublicOrgan } from './organs-content';

function MapPin({ className }: { readonly className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function Mail({ className }: { readonly className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}
function Phone({ className }: { readonly className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2Z" />
    </svg>
  );
}
function Globe({ className }: { readonly className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15 15 0 0 1 0 20" />
      <path d="M12 2a15 15 0 0 0 0 20" />
    </svg>
  );
}

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

interface Props {
  readonly organ: PublicOrgan;
  readonly index: number;
}

/**
 * One card for a single organ. Logo, name, member count, contact bullets.
 *
 * The card is not itself a link. It already holds mailto/tel/website
 * anchors, and an anchor inside an anchor is invalid HTML that browsers
 * resolve by unnesting it — which would have broken the contact links.
 * The name and an explicit footer link carry the navigation instead.
 */
export function OrganCard({ organ, index }: Props) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, delay: 0.05 + (index % 6) * 0.06, ease }}
      className="group relative flex h-full flex-col overflow-hidden rounded-xs border border-black/8 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-500 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_18px_40px_-12px_rgba(139,21,51,0.16)]"
    >
      <div className="flex items-start gap-4">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xs border border-black/8 bg-black/5">
          {organ.logoUrl ? (
            <Image
              src={organ.logoUrl}
              alt={organ.name}
              fill
              sizes="56px"
              quality={70}
              className="object-contain"
            />
          ) : (
            <div className="grid h-full w-full place-items-center font-heading text-lg font-thin text-black/40">
              {(organ.shortName ?? organ.name).slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3
            className="font-heading font-light leading-tight text-black"
            style={{ fontSize: '1.05rem', letterSpacing: '-0.005em' }}
          >
            <Link
              href={`/organs/${organ.slug}`}
              className="transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {organ.name}
            </Link>
          </h3>
          {(organ.location || organ.country) && (
            <p className="mt-1 flex items-center gap-1.5 text-[12px] text-black/55">
              <MapPin className="h-3 w-3" />
              {[organ.location, organ.country].filter(Boolean).join(', ')}
              {organ.foundedYear && ` · est. ${organ.foundedYear}`}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end">
          <span
            className="font-heading font-thin leading-none tabular-nums text-black"
            style={{ fontSize: '1.5rem' }}
          >
            {organ.memberCount.toLocaleString()}
          </span>
          <span className="mt-1 text-[9.5px] font-medium uppercase tracking-[0.24em] text-black/45">
            Members
          </span>
        </div>
      </div>

      {organ.description && (
        <p className="mt-5 line-clamp-3 text-[13.5px] leading-[1.65] text-black/60">
          {organ.description}
        </p>
      )}

      {(organ.contactEmail || organ.contactPhone || organ.websiteUrl) && (
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-black/8 pt-4 text-[12.5px] text-black/60">
          {organ.contactEmail && (
            <a
              href={`mailto:${organ.contactEmail}`}
              className="inline-flex items-center gap-1.5 transition-colors hover:text-primary"
            >
              <Mail className="h-3.5 w-3.5" />
              {organ.contactEmail}
            </a>
          )}
          {organ.contactPhone && (
            <a
              href={`tel:${organ.contactPhone.replace(/\s+/g, '')}`}
              className="inline-flex items-center gap-1.5 transition-colors hover:text-primary"
            >
              <Phone className="h-3.5 w-3.5" />
              {organ.contactPhone}
            </a>
          )}
          {organ.websiteUrl && (
            <a
              href={organ.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-primary"
            >
              <Globe className="h-3.5 w-3.5" />
              Website
            </a>
          )}
        </div>
      )}

      {/* Pushed to the bottom so cards of differing content still line
          their footers up across a row. */}
      <Link
        href={`/organs/${organ.slug}`}
        className="mt-auto inline-flex items-center gap-2 pt-5 text-[12.5px] font-medium tracking-wide text-primary transition-transform duration-300 hover:translate-x-0.5"
      >
        Branch profile
        <span aria-hidden>→</span>
      </Link>
    </motion.article>
  );
}
