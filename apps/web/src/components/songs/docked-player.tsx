'use client';

import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';

import { downloadFile } from '@/lib/download-file';
import { usePlayer } from './player-context';
import { PlayerWaveform } from './player-waveform';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

function PlayIcon({ className }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7L8 5z" />
    </svg>
  );
}
function PauseIcon({ className }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}
function PrevIcon({ className }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M6 5h2v14H6zM20 5v14L9 12l11-7z" />
    </svg>
  );
}
function NextIcon({ className }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M16 5h2v14h-2zM4 5v14l11-7L4 5z" />
    </svg>
  );
}
function DownloadIcon({ className }: { readonly className?: string }) {
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
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  );
}
function CloseIcon({ className }: { readonly className?: string }) {
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
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * The full-width bar that docks to the bottom of the /songs page while
 * a song is loaded. It slides up on first play and stays until the
 * user hits the close (×) button. Includes cover, title, wave-form
 * seek strip, current-time / duration counters, prev/play/next
 * transport, and a download link.
 */
export function DockedPlayer() {
  const player = usePlayer();
  const song = player.current;

  return (
    <AnimatePresence>
      {song && (
        <motion.div
          key="dock"
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ duration: 0.55, ease }}
          className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-3 md:px-6 md:pb-6"
        >
          <div className="pointer-events-auto relative w-full max-w-350 overflow-hidden rounded-xs border border-black/10 bg-black text-white shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.55)]">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-30"
              style={{
                background:
                  'radial-gradient(60% 120% at 20% 50%, color-mix(in srgb, var(--color-primary) 45%, transparent) 0%, transparent 70%), radial-gradient(60% 120% at 90% 50%, color-mix(in srgb, var(--color-primary) 22%, transparent) 0%, transparent 70%)',
              }}
            />

            <div className="relative flex flex-col gap-3 p-3 md:flex-row md:items-center md:gap-4 md:p-4">
              {/* Left, cover + meta */}
              <div className="flex items-center gap-3 md:min-w-[220px] md:max-w-[280px]">
                <motion.div
                  key={song.id}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.4, ease }}
                  className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xs border border-white/10 bg-white/5"
                >
                  {song.coverUrl ? (
                    <Image
                      src={song.coverUrl}
                      alt={song.title}
                      fill
                      sizes="56px"
                      quality={70}
                      className="object-cover"
                    />
                  ) : (
                    <span className="grid h-full w-full place-items-center font-heading text-sm font-thin text-white/80">
                      {song.title.slice(0, 2).toUpperCase()}
                    </span>
                  )}

                  {/* Ring pulse when playing */}
                  {player.isPlaying && (
                    <motion.span
                      aria-hidden
                      className="pointer-events-none absolute -inset-1 rounded-xs border border-primary/60"
                      animate={{ opacity: [0.9, 0, 0.9], scale: [1, 1.15, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )}
                </motion.div>
                <div className="min-w-0">
                  <p className="truncate font-heading text-[15px] font-light text-white">
                    {song.title}
                  </p>
                  <p className="truncate text-[11px] uppercase tracking-[0.24em] text-white/60">
                    {song.performer ?? 'SHESA'}
                  </p>
                </div>
              </div>

              {/* Middle, transport + waveform */}
              <div className="flex flex-1 flex-col gap-1">
                <div className="flex items-center justify-center gap-2">
                  <ControlButton onClick={player.prev} label="Previous">
                    <PrevIcon className="h-4 w-4" />
                  </ControlButton>
                  <button
                    type="button"
                    onClick={player.toggle}
                    aria-label={player.isPlaying ? 'Pause' : 'Play'}
                    className="grid h-11 w-11 place-items-center rounded-full bg-white text-primary transition-all duration-300 hover:scale-105 hover:bg-primary hover:text-white"
                  >
                    {player.isPlaying ? (
                      <PauseIcon className="h-5 w-5" />
                    ) : (
                      <PlayIcon className="h-5 w-5 translate-x-[1px]" />
                    )}
                  </button>
                  <ControlButton onClick={player.next} label="Next">
                    <NextIcon className="h-4 w-4" />
                  </ControlButton>
                </div>

                <div className="flex items-center gap-2 text-[10.5px] font-mono tabular-nums text-white/70">
                  <span className="w-10 text-right">{formatTime(player.currentTime)}</span>
                  <div className="flex-1">
                    <PlayerWaveform
                      progress={player.progress}
                      isPlaying={player.isPlaying}
                      onSeek={player.seekPercent}
                    />
                  </div>
                  <span className="w-10">{formatTime(player.duration)}</span>
                </div>
              </div>

              {/* Right, download + close */}
              <div className="flex shrink-0 items-center gap-1 md:min-w-[100px] md:justify-end">
                <button
                  type="button"
                  onClick={() => void downloadFile(song.audioUrl, song.title)}
                  aria-label={`Download ${song.title}`}
                  className="grid h-9 w-9 place-items-center rounded-xs border border-white/15 bg-white/5 text-white/75 transition-all hover:border-primary hover:bg-primary hover:text-white"
                >
                  <DownloadIcon className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={player.pause}
                  aria-label="Close player"
                  className="grid h-9 w-9 place-items-center rounded-xs border border-white/15 bg-white/5 text-white/75 transition-all hover:border-white/60 hover:text-white"
                >
                  <CloseIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ControlButton({
  onClick,
  label,
  children,
}: {
  readonly onClick: () => void;
  readonly label: string;
  readonly children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid h-8 w-8 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
    >
      {children}
    </button>
  );
}
