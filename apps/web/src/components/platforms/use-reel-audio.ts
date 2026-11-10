'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { MUSIC_SOURCES, VO_DIR, type Scene } from './platforms-content';

/**
 * Sound for the platforms reels: a looping music bed, one voiceover clip
 * per scene, and a synthesised whoosh for section cuts.
 *
 * Modelled on the cup trailer's `use-trailer-audio`, with two changes.
 * The bed loops, because the venue reel runs for hours and the pitch is
 * longer than any one track. And the bed ducks under the voice: when a
 * scene has a clip, the music drops to a murmur and comes back up after.
 *
 * Every file is optional. No bed means silence, no clip means the scene
 * holds for its estimated time instead. Nothing here can stop the
 * pictures running.
 */

const BED_FULL = 0.55;
const BED_UNDER_VOICE = 0.14;

export function useReelAudio({ voiceover }: { readonly voiceover: boolean }) {
  const contextRef = useRef<AudioContext | null>(null);
  const bedRef = useRef<HTMLAudioElement | null>(null);
  const clipsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const fadeCancelRef = useRef<(() => void) | null>(null);
  const startedRef = useRef(false);
  const mutedRef = useRef(false);
  const [muted, setMuted] = useState(false);

  const ramp = useCallback((target: number, ms: number) => {
    const bed = bedRef.current;
    if (!bed) return;
    fadeCancelRef.current?.();
    fadeCancelRef.current = fadeTo(bed, target, ms);
  }, []);

  /**
   * Loads every scene's clip and resolves with how long each one runs, in
   * seconds. A clip that 404s, fails to decode or takes more than a few
   * seconds to answer is simply absent from the map.
   */
  const preload = useCallback(
    async (scenes: readonly Scene[]): Promise<Map<string, number>> => {
      const durations = new Map<string, number>();
      if (!voiceover) return durations;
      await Promise.all(
        scenes
          .filter((s) => s.vo)
          .map(
            (scene) =>
              new Promise<void>((resolve) => {
                const audio = new Audio();
                audio.preload = 'auto';
                const done = () => {
                  window.clearTimeout(timer);
                  resolve();
                };
                const timer = window.setTimeout(done, 5000);
                audio.addEventListener(
                  'loadedmetadata',
                  () => {
                    if (Number.isFinite(audio.duration) && audio.duration > 0) {
                      durations.set(scene.id, audio.duration);
                      clipsRef.current.set(scene.id, audio);
                    }
                    done();
                  },
                  { once: true },
                );
                audio.addEventListener('error', done, { once: true });
                audio.src = `${VO_DIR}/${scene.id}.mp3`;
                audio.load();
              }),
          ),
      );
      return durations;
    },
    [voiceover],
  );

  /** Called from the gate's click: browsers only allow sound after one. */
  const start = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;

    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctor) {
      contextRef.current = new Ctor();
      try {
        await contextRef.current.resume();
      } catch {
        // The cues are garnish. Carry on without them.
      }
    }

    for (const src of MUSIC_SOURCES) {
      const bed = new Audio(src);
      bed.loop = true;
      bed.volume = 0;
      try {
        await bed.play();
        bedRef.current = bed;
        ramp(BED_FULL, 1800);
        break;
      } catch {
        // Missing or refused: try the next source.
      }
    }
  }, [ramp]);

  /**
   * Plays the clip for `id` from `fromSeconds`, ducking the bed under it.
   * Returns a stop function. Safe to call for a scene with no clip.
   */
  const playClip = useCallback(
    (id: string, fromSeconds: number): (() => void) => {
      const clip = clipsRef.current.get(id);
      if (!clip) return () => undefined;
      clip.muted = mutedRef.current;
      if (fromSeconds < clip.duration) {
        clip.currentTime = fromSeconds;
        void clip.play().catch(() => undefined);
        if (!mutedRef.current) ramp(BED_UNDER_VOICE, 350);
      }
      const onEnded = () => {
        if (!mutedRef.current) ramp(BED_FULL, 1200);
      };
      clip.addEventListener('ended', onEnded, { once: true });
      return () => {
        clip.removeEventListener('ended', onEnded);
        clip.pause();
        if (!mutedRef.current) ramp(BED_FULL, 900);
      };
    },
    [ramp],
  );

  /** Filtered noise sweeping upward — rides under a section cut. */
  const whoosh = useCallback(() => {
    const ctx = contextRef.current;
    if (!ctx || mutedRef.current) return;
    const now = ctx.currentTime;
    const frames = Math.floor(ctx.sampleRate * 0.7);
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i += 1) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.Q.value = 1.1;
    band.frequency.setValueAtTime(260, now);
    band.frequency.exponentialRampToValueAtTime(3200, now + 0.5);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.1, now + 0.24);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
    noise.connect(band).connect(gain).connect(ctx.destination);
    noise.start(now);
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      mutedRef.current = next;
      const bed = bedRef.current;
      if (bed) {
        if (next) bed.muted = true;
        ramp(next ? 0 : BED_FULL, 400);
        if (!next) bed.muted = false;
      }
      clipsRef.current.forEach((clip) => {
        clip.muted = next;
      });
      return next;
    });
  }, [ramp]);

  useEffect(() => {
    const clips = clipsRef.current;
    return () => {
      fadeCancelRef.current?.();
      bedRef.current?.pause();
      bedRef.current = null;
      clips.forEach((clip) => clip.pause());
      clips.clear();
      void contextRef.current?.close();
      contextRef.current = null;
    };
  }, []);

  return { start, preload, playClip, whoosh, muted, toggleMute };
}

function fadeTo(audio: HTMLAudioElement, target: number, ms: number): () => void {
  const from = audio.volume;
  const startedAt = performance.now();
  let frame = 0;
  let cancelled = false;
  const step = (now: number) => {
    if (cancelled) return;
    const t = Math.min(1, (now - startedAt) / ms);
    audio.volume = Math.min(1, Math.max(0, from + (target - from) * t));
    if (t < 1) frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);
  return () => {
    cancelled = true;
    cancelAnimationFrame(frame);
  };
}
