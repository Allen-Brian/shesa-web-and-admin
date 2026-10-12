'use client';

import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';

import { downloadUrl } from './download';
import type { MediaItem } from './gallery-content';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

interface LightboxProps {
  readonly items: readonly MediaItem[];
  readonly index: number | null;
  readonly onClose: () => void;
  readonly onIndexChange: (i: number) => void;
  readonly albumTitle?: string;
}

export function Lightbox({ items, index, onClose, onIndexChange, albumTitle }: LightboxProps) {
  const open = index !== null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' && index !== null && index < items.length - 1)
        onIndexChange(index + 1);
      else if (e.key === 'ArrowLeft' && index !== null && index > 0) onIndexChange(index - 1);
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, index, items.length, onClose, onIndexChange]);

  const current = index !== null ? items[index] : undefined;
  const hasPrev = index !== null && index > 0;
  const hasNext = index !== null && index < items.length - 1;

  const handleDownload = () => {
    if (!current) return;
    downloadUrl(current.src, `${albumTitle ?? 'shesa'}-${current.id}`);
  };

  return (
    <AnimatePresence>
      {open && current && (
        <motion.div
          key="lightbox"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-sm"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={current.alt}
        >
          {/* Toolbar */}
          <div
            className="relative z-10 flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4 text-white md:px-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="min-w-0">
              {albumTitle && (
                <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-white/60">
                  {albumTitle}
                </p>
              )}
              <p className="mt-0.5 truncate font-heading text-sm font-light text-white/90">
                {current.alt}, {(index ?? 0) + 1} / {items.length}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ToolbarButton onClick={handleDownload} label="Download">
                <DownloadIcon />
                <span className="hidden sm:inline">Download</span>
              </ToolbarButton>
              <ToolbarButton onClick={onClose} label="Close">
                <CloseIcon />
              </ToolbarButton>
            </div>
          </div>

          {/* Stage */}
          <div
            className="relative flex flex-1 items-center justify-center overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={current.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.35, ease }}
                className="relative flex h-full max-h-[calc(100vh-140px)] w-full max-w-6xl items-center justify-center px-4 md:px-12"
              >
                {current.type === 'photo' ? (
                  <div className="relative h-full w-full">
                    <Image
                      src={current.src}
                      alt={current.alt}
                      fill
                      priority
                      sizes="(min-width: 1024px) 80vw, 100vw"
                      quality={75}
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <video
                    src={current.src}
                    poster={current.poster}
                    controls
                    playsInline
                    preload="metadata"
                    className="h-full w-full max-h-full object-contain"
                  />
                )}
              </motion.div>
            </AnimatePresence>

            {hasPrev && index !== null && (
              <NavButton
                direction="left"
                onClick={() => onIndexChange(index - 1)}
                label="Previous"
              />
            )}
            {hasNext && index !== null && (
              <NavButton direction="right" onClick={() => onIndexChange(index + 1)} label="Next" />
            )}
          </div>

          {/* Thumbnail strip */}
          <div
            className="relative z-10 border-t border-white/10 px-5 py-3 md:px-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-2 overflow-x-auto" data-lenis-prevent-wheel>
              {items.map((m, i) => {
                const active = i === index;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onIndexChange(i)}
                    aria-label={`Show item ${i + 1}`}
                    className={`relative h-12 w-16 shrink-0 overflow-hidden rounded-xs border transition-all md:h-14 md:w-20 ${
                      active
                        ? 'border-primary opacity-100'
                        : 'border-white/10 opacity-50 hover:opacity-90'
                    }`}
                  >
                    <Image
                      src={m.thumbnail ?? m.poster ?? m.src}
                      alt=""
                      fill
                      sizes="80px"
                      quality={45}
                      className="object-cover"
                    />
                    {m.type === 'video' && (
                      <span
                        aria-hidden
                        className="absolute inset-0 grid place-items-center bg-black/40 text-white"
                      >
                        <PlayGlyph />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ToolbarButton({
  children,
  onClick,
  label,
}: {
  readonly children: React.ReactNode;
  readonly onClick: () => void;
  readonly label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex items-center gap-2 rounded-xs border border-white/20 bg-white/5 px-3 py-2 text-[12.5px] font-medium tracking-wide text-white transition-colors hover:border-white/50 hover:bg-white/10"
    >
      {children}
    </button>
  );
}

function NavButton({
  direction,
  onClick,
  label,
}: {
  readonly direction: 'left' | 'right';
  readonly onClick: () => void;
  readonly label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`absolute top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/40 text-white transition-all hover:bg-primary hover:border-primary md:h-14 md:w-14 ${
        direction === 'left' ? 'left-3 md:left-6' : 'right-3 md:right-6'
      }`}
    >
      <span aria-hidden>{direction === 'left' ? '←' : '→'}</span>
    </button>
  );
}

function DownloadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function PlayGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7L8 5z" />
    </svg>
  );
}
