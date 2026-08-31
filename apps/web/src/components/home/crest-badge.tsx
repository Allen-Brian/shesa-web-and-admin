'use client';

import Image from 'next/image';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useMemo, type PointerEvent } from 'react';

interface CrestBadgeProps {
  readonly className?: string;
  /**
   * Whether the crest is currently "beating". Controlled by the
   * parent (Hero listens for pointer enter/leave on the whole
   * section so hovering anywhere in it triggers the beat).
   */
  readonly beating?: boolean;
}

/**
 * The SHESA crest, presented with cinematic treatment:
 *   - Burgundy radial glow behind it (pulses on the beat)
 *   - Heartbeat scale animation, only while the pointer is hovering
 *     the crest. At rest the composition is completely still to keep
 *     the hero calm.
 *   - 3D tilt that follows the pointer inside the badge
 *   - A cloud of drifting embers rising past it (always on, subtle,
 *     ambient)
 *
 * The heartbeat is the classic lub-dub keyframe pattern (S1 systole,
 * short partial-release, S2 diastole, settle, long rest). The glow
 * pulse + ground shadow share the same duration/times array so the
 * whole composition breathes in sync when hover-triggered.
 */

const BEAT_DURATION_S = 2.8;
const BEAT_TIMES = [0, 0.12, 0.22, 0.34, 0.46, 1] as const;
const BEAT_SCALE = [1, 1.035, 1.008, 1.025, 1, 1] as const;
const GLOW_SCALE = [1, 1.05, 1.015, 1.04, 1, 1] as const;
const GLOW_OPACITY = [0.55, 0.8, 0.65, 0.75, 0.55, 0.55] as const;
const SHADOW_SCALE_X = [1, 0.95, 0.98, 0.96, 1, 1] as const;
const SHADOW_OPACITY = [0.55, 0.68, 0.6, 0.65, 0.55, 0.55] as const;

const REST_EASE = [0.22, 1, 0.36, 1] as const;
const REST_DURATION_S = 0.9;

export function CrestBadge({ className, beating = false }: CrestBadgeProps) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [14, -14]), {
    stiffness: 180,
    damping: 20,
  });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-14, 14]), {
    stiffness: 180,
    damping: 20,
  });
  const glareX = useTransform(mx, [-0.5, 0.5], ['20%', '80%']);
  const glareY = useTransform(my, [-0.5, 0.5], ['20%', '80%']);

  const handleMove = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleLeave = () => {
    mx.set(0);
    my.set(0);
  };

  const embers = useMemo(
    () =>
      Array.from({ length: 24 }).map((_, i) => ({
        left: `${(i * 137.5) % 100}%`,
        size: 2 + ((i * 7) % 4),
        delay: (i * 0.6) % 6,
        duration: 5 + ((i * 1.3) % 4),
        drift: (i % 2 === 0 ? 1 : -1) * (10 + ((i * 3) % 20)),
      })),
    [],
  );

  const beatTransition = {
    duration: BEAT_DURATION_S,
    repeat: Infinity,
    ease: 'easeInOut' as const,
    times: [...BEAT_TIMES],
  };
  const restTransition = {
    duration: REST_DURATION_S,
    ease: [...REST_EASE] as [number, number, number, number],
  };

  return (
    <motion.div
      className={`relative flex items-center justify-center ${className ?? ''}`}
      style={{ perspective: 1400 }}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
    >
      <motion.div
        aria-hidden
        className="absolute inset-[-15%] rounded-full"
        style={{
          background:
            'radial-gradient(closest-side, color-mix(in srgb, var(--color-primary) 55%, transparent), transparent 70%)',
          filter: 'blur(50px)',
        }}
        animate={
          beating
            ? { scale: [...GLOW_SCALE], opacity: [...GLOW_OPACITY] }
            : { scale: 1, opacity: 0.55 }
        }
        transition={beating ? beatTransition : restTransition}
      />

      <div aria-hidden className="pointer-events-none absolute inset-[-35%] overflow-hidden">
        {embers.map((e, i) => (
          <motion.span
            key={i}
            className="absolute bottom-0 block rounded-full bg-primary"
            style={{
              left: e.left,
              width: e.size,
              height: e.size,
              boxShadow: '0 0 8px 2px color-mix(in srgb, var(--color-primary) 60%, transparent)',
            }}
            initial={{ y: 0, opacity: 0, x: 0 }}
            animate={{
              y: ['0%', '-120%'],
              x: [0, e.drift, 0],
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              duration: e.duration,
              delay: e.delay,
              repeat: Infinity,
              ease: 'easeOut',
              times: [0, 0.15, 0.7, 1],
            }}
          />
        ))}
      </div>

      <motion.div
        className="relative z-10 h-full w-full"
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
        }}
        animate={beating ? { scale: [...BEAT_SCALE] } : { scale: 1 }}
        transition={beating ? beatTransition : restTransition}
      >
        <Image
          src="/shesa.png"
          alt="SHESA, Viriliter Age"
          width={1200}
          height={1200}
          priority
          className="h-full w-full select-none object-contain drop-shadow-[0_40px_60px_rgba(0,0,0,0.55)]"
          style={{
            filter: 'drop-shadow(0 10px 20px rgba(139,21,51,0.45))',
          }}
        />

        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full mix-blend-overlay"
          style={{
            background:
              'radial-gradient(circle at var(--glare-x) var(--glare-y), rgba(255,255,255,0.5), transparent 40%)',
            ['--glare-x' as string]: glareX,
            ['--glare-y' as string]: glareY,
          }}
        />
      </motion.div>

      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-8 h-8 w-3/5 rounded-[50%] bg-black/60 blur-2xl"
        animate={
          beating
            ? { scaleX: [...SHADOW_SCALE_X], opacity: [...SHADOW_OPACITY] }
            : { scaleX: 1, opacity: 0.55 }
        }
        transition={beating ? beatTransition : restTransition}
      />
    </motion.div>
  );
}
