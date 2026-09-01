'use client';

import Lenis from 'lenis';
import { useEffect, type ReactNode } from 'react';

interface LenisProviderProps {
  readonly children: ReactNode;
}

/**
 * The live instance, so overlays can freeze the page behind them.
 * Smooth scrolling is driven by Lenis rather than the browser, so
 * `overflow: hidden` on the body alone does not stop a wheel gesture.
 */
let instance: Lenis | null = null;

/** Freeze background scrolling, e.g. while a modal is open. */
export function stopLenis() {
  instance?.stop();
}

/** Release the freeze. */
export function startLenis() {
  instance?.start();
}

export function LenisProvider({ children }: LenisProviderProps) {
  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.1,
      duration: 1.2,
      smoothWheel: true,
    });
    instance = lenis;

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      instance = null;
    };
  }, []);

  return <>{children}</>;
}
