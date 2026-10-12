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

import { recordPlay, recordView } from '@/lib/content-metrics';

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
  /** Start at the top of the queue and run through it. */
  readonly playAll: () => void;
  /** True while the queue is running itself track to track. */
  readonly isQueueRunning: boolean;
  readonly queueLength: number;
}

const PlayerContext = createContext<PlayerState | null>(null);

/**
 * One `<audio>` for the whole application, not one per provider.
 *
 * The layout should mean only a single provider ever mounts, but this is
 * the guarantee rather than the assumption: an element held in a module
 * cannot be duplicated by a second provider, a fast-refresh remount, or a
 * future page that wraps its own. Two songs playing over each other is
 * the one failure a music page cannot laugh off.
 */
let sharedAudio: HTMLAudioElement | null = null;

/**
 * Count a listen — and the view that must have come with it.
 *
 * Called wherever a track *starts from the beginning* — a card, "play
 * all", a skip, a replay, and the auto-advance below. Resuming after a
 * pause deliberately does not count: that is one listen continuing, not
 * a second one.
 *
 * Playing a song is also viewing it. Views used to be recorded only by
 * the detail page, so a visitor who pressed play from the grid and never
 * opened the track counted as a listener nobody had — and the card could
 * show plays above a view count of zero, which reads as a broken number
 * rather than as a distinction.
 *
 * The two counters keep their own meanings: `recordView` is deduplicated
 * per visitor for good, so however many times this fires, one person is
 * one view. Only the plays accumulate.
 *
 * Never awaited. A counter must not put a network round trip between the
 * visitor pressing play and the audio starting.
 */
function countPlay(song: PublicSong): void {
  void recordPlay(song.id);
  void recordView('song', song.id);
}

function getSharedAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  if (!sharedAudio) {
    sharedAudio = new Audio();
    sharedAudio.preload = 'metadata';
  }
  return sharedAudio;
}

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
  const [isQueueRunning, setQueueRunning] = useState(false);

  /**
   * `ended` fires from a listener registered once, so it cannot close
   * over the current track or queue. These refs are how it reads them —
   * re-registering the listener on every change would be the alternative,
   * and it drops the event if a track ends mid-render.
   */
  const currentRef = useRef<PublicSong | null>(null);
  const queueRef = useRef<readonly PublicSong[]>(initialQueue);
  currentRef.current = current;
  queueRef.current = queue;

  useEffect(() => {
    const el = getSharedAudio();
    if (!el) return;
    audioRef.current = el;

    const onTime = () => {
      setCurrentTime(el.currentTime);
      if (el.duration && Number.isFinite(el.duration)) setDuration(el.duration);
    };
    const onMeta = () => {
      if (el.duration && Number.isFinite(el.duration)) setDuration(el.duration);
    };

    /**
     * Roll on to the next track when one finishes.
     *
     * Deliberately does not wrap. `next()` cycles, which is right when a
     * listener asks for it, but a queue that silently restarts at the top
     * after the last track is a player nobody can leave running.
     */
    const onEnded = () => {
      const list = queueRef.current;
      const now = currentRef.current;
      const idx = now ? list.findIndex((s) => s.id === now.id) : -1;
      const upNext = idx >= 0 ? list[idx + 1] : undefined;

      if (!upNext) {
        setPlaying(false);
        setQueueRunning(false);
        return;
      }

      el.src = upNext.audioUrl;
      setCurrent(upNext);
      setCurrentTime(0);
      setDuration(upNext.durationSeconds ?? 0);
      countPlay(upNext);
      void el
        .play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    };

    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('ended', onEnded);

    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('ended', onEnded);
    };
  }, []);

  /**
   * Picking a track by hand ends the "play all" run — the visitor has
   * taken over the choice, and leaving the flag set would have the button
   * offering to pause a run that is no longer the one playing.
   *
   * Skipping with next/prev does not count as taking over, which is why
   * `stepBy` restores the flag rather than going through here untouched.
   */
  const play = useCallback(
    (song: PublicSong) => {
      const el = audioRef.current;
      if (!el) return;
      setQueueRunning(false);
      const sameSong = current?.id === song.id;
      if (!sameSong) {
        el.src = song.audioUrl;
        setCurrent(song);
        setCurrentTime(0);
        setDuration(song.durationSeconds ?? 0);
      }

      // A new track is always a play. The same track only counts again
      // if it is starting over — pressing play on a song paused halfway
      // is a resume, and `ended` covers the case where it ran to the end
      // and the visitor wants it again.
      if (!sameSong || el.ended || el.currentTime === 0) countPlay(song);

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
      if (!target) return;
      const wasRunning = isQueueRunning;
      play(target);
      if (wasRunning) setQueueRunning(true);
    },
    [current, queue, play, isQueueRunning],
  );

  const next = useCallback(() => stepBy(1), [stepBy]);
  const prev = useCallback(() => stepBy(-1), [stepBy]);

  const playAll = useCallback(() => {
    const first = queue[0];
    if (!first) return;
    // After `play`, which clears the flag — the later setter is the one
    // that survives the batch.
    play(first);
    setQueueRunning(true);
  }, [queue, play]);

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
      playAll,
      isQueueRunning,
      queueLength: queue.length,
    }),
    [
      current,
      isPlaying,
      currentTime,
      duration,
      play,
      toggle,
      pause,
      seekPercent,
      next,
      prev,
      playAll,
      isQueueRunning,
      queue.length,
    ],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerState {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used inside <PlayerProvider>.');
  return ctx;
}
