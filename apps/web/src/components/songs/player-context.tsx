'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { PublicSong } from './songs-content';

interface PlayerState {
  readonly current: PublicSong | null;
  readonly isPlaying: boolean;
  readonly progress: number; // 0..1
  readonly currentTime: number; // seconds
  readonly duration: number; // seconds
  readonly play: (song: PublicSong) => void;
  readonly toggle: () => void;
  readonly pause: () => void;
  readonly seekPercent: (pct: number) => void;
  readonly next: () => void;
  readonly prev: () => void;
  readonly setQueue: (list: readonly PublicSong[]) => void;
}

const PlayerContext = createContext<PlayerState | null>(null);

/**
 * Wraps the /songs page. Holds a single `<audio>` element off-screen so
 * playback survives scrolls and route changes to component siblings
 * (the docked player, the tile cards, etc.). Everything else in the
 * gallery only reads/writes state through this context.
 */
export function PlayerProvider({
  children,
  initialQueue,
}: {
  readonly children: React.ReactNode;
  readonly initialQueue: readonly PublicSong[];
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [queue, setQueue] = useState<readonly PublicSong[]>(initialQueue);
  const [current, setCurrent] = useState<PublicSong | null>(null);
  const [isPlaying, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (audioRef.current) return;
    const el = new Audio();
    el.preload = 'metadata';
    audioRef.current = el;

    el.addEventListener('timeupdate', () => {
      setCurrentTime(el.currentTime);
      if (el.duration && Number.isFinite(el.duration)) setDuration(el.duration);
    });
    el.addEventListener('loadedmetadata', () => {
      if (el.duration && Number.isFinite(el.duration)) setDuration(el.duration);
    });
    el.addEventListener('ended', () => {
      setPlaying(false);
    });
  }, []);

  const play = useCallback(
    (song: PublicSong) => {
      const el = audioRef.current;
      if (!el) return;
      const sameSong = current?.id === song.id;
      if (!sameSong) {
        el.src = song.audioUrl;
        setCurrent(song);
        setCurrentTime(0);
        setDuration(song.durationSeconds ?? 0);
      }
      void el
        .play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    },
    [current?.id],
  );

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el || !current) return;
    if (isPlaying) {
      el.pause();
      setPlaying(false);
    } else {
      void el
        .play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    }
  }, [current, isPlaying]);

  const seekPercent = useCallback((pct: number) => {
    const el = audioRef.current;
    if (!el || !Number.isFinite(el.duration)) return;
    const clamped = Math.min(1, Math.max(0, pct));
    el.currentTime = clamped * el.duration;
    setCurrentTime(el.currentTime);
  }, []);

  const stepBy = useCallback(
    (delta: number) => {
      if (!current) return;
      const idx = queue.findIndex((s) => s.id === current.id);
      if (idx < 0) return;
      const nextIdx = (idx + delta + queue.length) % queue.length;
      const target = queue[nextIdx];
      if (target) play(target);
    },
    [current, queue, play],
  );

  const next = useCallback(() => stepBy(1), [stepBy]);
  const prev = useCallback(() => stepBy(-1), [stepBy]);

  const value = useMemo<PlayerState>(
    () => ({
      current,
      isPlaying,
      progress: duration > 0 ? currentTime / duration : 0,
      currentTime,
      duration,
      play,
      toggle,
      pause,
      seekPercent,
      next,
      prev,
      setQueue: (list) => setQueue(list),
    }),
    [current, isPlaying, currentTime, duration, play, toggle, pause, seekPercent, next, prev],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerState {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used inside <PlayerProvider>.');
  return ctx;
}
