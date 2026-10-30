'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { MUSIC_SRC } from './cup-content';

/**
 * Sound for the trailer: a music bed plus synthesised transition cues.
 *
 * ─── Why there is a gate on the page at all ───────────────────────────
 * Browsers refuse to start audio until the user has interacted with the
 * page, and an AudioContext created before that interaction is born
 * suspended. There is no way around it and no reason to want one. So
 * the trailer opens on a title card with a play button, and that click
 * is what unlocks everything here. It also buys the seconds we need to
 * preload the images, which is why the sequence never stutters.
 *
 * ─── Why the cues are synthesised ─────────────────────────────────────
 * The impacts and whooshes are generated with oscillators and filtered
 * noise rather than loaded from files. Two reasons: the page works with
 * no assets at all, which is what lets the motion be judged before the
 * sound design exists; and a cue triggered from code lands exactly on
 * the frame that triggered it, where a loaded sample has to be fetched,
 * decoded and scheduled first.
 *
 * The music is the opposite case and stays a plain `<audio>` element.
 * It is long, it only needs to start once, and streaming it is the
 * whole point. A missing file is handled as silence rather than as an
 * error: until a real track is dropped in, the page still runs.
 */

export type TrailerAudio = ReturnType<typeof useTrailerAudio>;

export function useTrailerAudio() {
  const contextRef = useRef<AudioContext | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  /** Cancels an in-flight volume ramp. See `fadeTo`. */
  const fadeCancelRef = useRef<(() => void) | null>(null);
  /** Guards re-entry into `start`. See the note in `start`. */
  const startedRef = useRef(false);
  const [muted, setMuted] = useState(false);
  const [started, setStarted] = useState(false);

  /** One ramp at a time: a new fade always cancels the running one. */
  const ramp = useCallback((audio: HTMLAudioElement, target: number, ms: number) => {
    fadeCancelRef.current?.();
    fadeCancelRef.current = fadeTo(audio, target, ms);
  }, []);

  /** Created lazily on the first gesture — see the note above. */
  const context = useCallback((): AudioContext | null => {
    if (typeof window === 'undefined') return null;
    if (!contextRef.current) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      contextRef.current = new Ctor();
    }
    return contextRef.current;
  }, []);

  /**
   * A low sine dropping in pitch under a short burst of noise. The drop
   * is what makes it read as an impact rather than as a beep.
   */
  const impact = useCallback(() => {
    const ctx = context();
    if (!ctx || muted) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.38);
    oscGain.gain.setValueAtTime(0.0001, now);
    oscGain.gain.exponentialRampToValueAtTime(0.5, now + 0.012);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
    osc.connect(oscGain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.65);

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer(ctx, 0.22);
    const noiseGain = ctx.createGain();
    const band = ctx.createBiquadFilter();
    band.type = 'lowpass';
    band.frequency.setValueAtTime(1600, now);
    band.frequency.exponentialRampToValueAtTime(220, now + 0.22);
    noiseGain.gain.setValueAtTime(0.22, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
    noise.connect(band).connect(noiseGain).connect(ctx.destination);
    noise.start(now);
  }, [context, muted]);

  /** Filtered noise sweeping upward. Rides under a cut or a reveal. */
  const whoosh = useCallback(() => {
    const ctx = context();
    if (!ctx || muted) return;
    const now = ctx.currentTime;

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer(ctx, 0.7);
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.Q.value = 1.1;
    band.frequency.setValueAtTime(260, now);
    band.frequency.exponentialRampToValueAtTime(3200, now + 0.5);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.26);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.62);

    noise.connect(band).connect(gain).connect(ctx.destination);
    noise.start(now);
  }, [context, muted]);

  /** Called by the gate. Resumes the context and starts the bed. */
  const start = useCallback(async () => {
    // A play button that does not react instantly gets tapped twice,
    // and without this the second tap builds a second <audio> and
    // overwrites the ref pointing at the first. The first then plays
    // on forever, unreachable by the mute button and by the unmount
    // cleanup, half a beat out of phase with its twin.
    if (startedRef.current) return;
    startedRef.current = true;

    const ctx = context();
    if (ctx && ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        // Nothing to do. The visual sequence runs regardless.
      }
    }

    const audio = new Audio(MUSIC_SRC);
    // Not looped. The track is cut to the trailer's running time, so a
    // loop would only ever play the first fraction of a second of the
    // intro again over the closing slide. If a future track comes in
    // short, the tail is silence rather than a seam, which is the
    // better of the two failures.
    audio.loop = false;
    audio.volume = 0;
    musicRef.current = audio;

    try {
      await audio.play();
      // Fade in rather than cutting in — a bed that arrives at full
      // volume announces itself, which is the opposite of a bed.
      ramp(audio, 0.65, 1800);
    } catch {
      // No file yet, or the browser refused anyway. Silence is a
      // perfectly good outcome here; the cues still fire.
      musicRef.current = null;
    }

    setStarted(true);
  }, [context]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      const audio = musicRef.current;
      if (audio) {
        // `muted` as well as the ramp. The ramp alone left the element
        // unmuted at volume 0, so a still-running fade-in could walk
        // the volume back up while the button read "muted"; and the
        // flag is what the OS and browser media controls reflect.
        if (next) audio.muted = true;
        ramp(audio, next ? 0 : 0.65, 400);
        if (!next) audio.muted = false;
      }
      return next;
    });
  }, [ramp]);

  // Stop the bed when the trailer unmounts, otherwise navigating away
  // leaves music playing over the rest of the site.
  useEffect(() => {
    return () => {
      // Cancel the ramp first: it holds the element and would keep
      // scheduling frames against a paused, detached node for up to
      // the remainder of its duration.
      fadeCancelRef.current?.();
      fadeCancelRef.current = null;
      musicRef.current?.pause();
      musicRef.current = null;
      void contextRef.current?.close();
      contextRef.current = null;
    };
  }, []);

  return { start, started, muted, toggleMute, impact, whoosh };
}

/** White noise, generated once per cue. Cheap at these durations. */
function noiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const frames = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/**
 * Linear volume ramp on an `<audio>` element. Returns a canceller.
 *
 * Returning one is the whole point. Without it the 1.8s fade-in and a
 * 400ms fade-to-mute run concurrently, each with its own start volume
 * and deadline, and whichever finishes last wins — which is how the
 * music used to un-mute itself a second after the viewer muted it.
 */
function fadeTo(audio: HTMLAudioElement, target: number, ms: number): () => void {
  const from = audio.volume;
  const startedAt = performance.now();
  let frame = 0;
  let cancelled = false;

  const step = (now: number) => {
    if (cancelled) return;
    const t = Math.min(1, (now - startedAt) / ms);
    audio.volume = from + (target - from) * t;
    if (t < 1) frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);

  return () => {
    cancelled = true;
    cancelAnimationFrame(frame);
  };
}
