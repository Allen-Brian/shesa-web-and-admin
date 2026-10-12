'use client';

import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Mail, Phone, X } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { startLenis, stopLenis } from '@/components/lenis-provider';

import { isLocalSupabaseUrl } from './is-local-supabase-url';
import type { LeaderProfile } from './leader-profile';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

interface ProfileControls {
  readonly open: (profile: LeaderProfile) => void;
}

const LeaderProfileContext = createContext<ProfileControls | null>(null);

/**
 * One modal for the whole Leadership page.
 *
 * The four strips — mainstream, branches, diaspora, batches — would
 * otherwise each carry their own open/close state and their own copy of
 * the overlay. They are all showing the same thing, so the state lives
 * here and a card only has to say "open this one".
 */
export function LeaderProfileProvider({ children }: { readonly children: ReactNode }) {
  const [profile, setProfile] = useState<LeaderProfile | null>(null);

  const open = useCallback((next: LeaderProfile) => setProfile(next), []);
  const controls = useMemo<ProfileControls>(() => ({ open }), [open]);

  return (
    <LeaderProfileContext.Provider value={controls}>
      {children}
      <LeaderProfileModal profile={profile} onClose={() => setProfile(null)} />
    </LeaderProfileContext.Provider>
  );
}

export function useLeaderProfile(): ProfileControls {
  const ctx = useContext(LeaderProfileContext);
  if (!ctx) throw new Error('useLeaderProfile must be used inside <LeaderProfileProvider>.');
  return ctx;
}

function LeaderProfileModal({
  profile,
  onClose,
}: {
  readonly profile: LeaderProfile | null;
  readonly onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const isOpen = profile !== null;

  useEffect(() => {
    if (!isOpen) return;

    stopLenis();
    panelRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      startLenis();
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {profile ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease }}
          onClick={onClose}
          /* Lenis is stopped while this is open, and a stopped Lenis
             calls preventDefault() on every touchmove whose path lacks
             this attribute — which would include the scroll gesture
             inside the panel. Without it the modal cannot be read on a
             phone. */
          data-lenis-prevent
          className="fixed inset-0 z-100 flex items-start justify-center overflow-y-auto overscroll-contain bg-black/70 p-4 backdrop-blur-md sm:p-6 md:items-center md:p-10"
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={`${profile.name}, ${profile.role}`}
            tabIndex={-1}
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.99 }}
            transition={{ duration: 0.5, ease }}
            // The panel keeps its own clicks: tapping the backdrop closes,
            // tapping a biography to select a line must not.
            onClick={(e) => e.stopPropagation()}
            className="relative my-auto grid w-full max-w-4xl overflow-hidden rounded-xs bg-white text-black shadow-[0_60px_160px_-30px_rgba(0,0,0,0.6)] outline-none md:grid-cols-5"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close profile"
              className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-xs bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-primary md:right-4 md:top-4"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>

            <div className="relative aspect-4/5 md:col-span-2 md:aspect-auto md:h-full">
              <Image
                src={profile.photo}
                alt={profile.name}
                fill
                sizes="(min-width: 768px) 40vw, 100vw"
                quality={80}
                unoptimized={isLocalSupabaseUrl(profile.photo)}
                className="object-cover object-top"
              />
            </div>

            <div className="p-6 md:col-span-3 md:p-10">
              <p className="font-heading text-[11px] font-medium uppercase tracking-[0.28em] text-primary">
                {profile.role}
              </p>

              <h2
                className="mt-3 font-heading font-thin leading-[1.08] text-black"
                style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', letterSpacing: '-0.02em' }}
              >
                {profile.name}
              </h2>

              {(profile.profession || profile.location) && (
                <p className="mt-3 text-[14px] leading-[1.7] text-black/60">
                  {[profile.profession, profile.location].filter(Boolean).join(' · ')}
                </p>
              )}

              {profile.bio && (
                // `whitespace-pre-line` keeps the paragraph breaks an
                // editor typed. A biography arrives as prose, not as one
                // block, and collapsing it reads as a wall.
                <p className="mt-6 whitespace-pre-line text-[15px] leading-[1.85] text-black/75">
                  {profile.bio}
                </p>
              )}

              {(profile.email || profile.phone) && (
                <div className="mt-7 flex flex-wrap items-center gap-2.5 border-t border-black/8 pt-6">
                  {profile.email && (
                    <a
                      href={`mailto:${profile.email}`}
                      className="inline-flex items-center gap-2 rounded-xs border border-black/15 px-4 py-2.5 text-[13px] tracking-wide text-black/70 transition-colors hover:border-primary hover:text-primary"
                    >
                      <Mail className="h-3.5 w-3.5" aria-hidden />
                      {profile.email}
                    </a>
                  )}
                  {profile.phone && (
                    <a
                      href={`tel:${profile.phone.replace(/[^\d+]/g, '')}`}
                      className="inline-flex items-center gap-2 rounded-xs border border-black/15 px-4 py-2.5 text-[13px] tracking-wide text-black/70 transition-colors hover:border-primary hover:text-primary"
                    >
                      <Phone className="h-3.5 w-3.5" aria-hidden />
                      {profile.phone}
                    </a>
                  )}
                </div>
              )}

              {profile.organHref && (
                <Link
                  href={profile.organHref}
                  onClick={onClose}
                  className="mt-6 inline-flex items-center gap-2.5 rounded-xs bg-primary px-6 py-3.5 text-sm font-medium tracking-wide text-primary-foreground transition-transform duration-500 hover:-translate-y-0.5"
                >
                  {profile.organName ? `Visit ${profile.organName}` : 'Visit the branch'}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
