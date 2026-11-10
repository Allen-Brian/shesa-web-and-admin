'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, ShieldCheck, TriangleAlert } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

import { EdgeVignette, Grain, PulseRing } from '@/components/cup/cup-graphics';

import {
  BrowserFrame,
  ConnectMock,
  PhoneFrame,
  PreviewTag,
  ShotReel,
  StoreMock,
  useStep,
} from './devices';
import {
  FLOWS,
  INVESTMENT,
  KPIS,
  LIVE_NOW,
  MEMBER_RECORD,
  PILLARS,
  PLATFORMS,
  PROBLEMS,
  PROTECTIONS,
  REVENUE,
  TECH,
  TRACTION,
  formatXaf,
  platform as getPlatform,
  type Platform,
  type Scene,
} from './platforms-content';

/**
 * Every scene in both reels.
 *
 * The visual language is the cup trailer's, on purpose: black stage,
 * Montserrat Light in wide-tracked capitals, one red, a vignette and a
 * little grain. A member who saw the tournament trailer should know at
 * a glance that this came from the same house.
 *
 * Every scene is told how long it has (`seconds`) and paces its own
 * reveals inside that, so a slower voiceover stretches the reveals with
 * it rather than leaving the last half of a slide static.
 *
 * `big` is the venue reel: fewer words, larger type, sized for the back
 * of a hall rather than a laptop across a table.
 */

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

export interface SceneProps {
  readonly scene: Scene;
  readonly seconds: number;
  readonly paused: boolean;
  readonly big: boolean;
  readonly qrSvg?: string;
}

export function SceneBody(props: SceneProps) {
  const { scene } = props;
  switch (scene.kind) {
    case 'cold':
      return <ColdScene {...props} />;
    case 'title':
      return <TitleScene {...props} />;
    case 'pillars':
      return <PillarsScene {...props} />;
    case 'problems':
      return <ProblemsScene {...props} />;
    case 'proof':
      return <ProofScene {...props} />;
    case 'ecosystem':
      return <EcosystemScene {...props} />;
    case 'live':
      return <LiveScene {...props} />;
    case 'traction':
      return <TractionScene {...props} />;
    case 'platform':
      return <PlatformScene {...props} platform={getPlatform(scene.platform ?? 'website')} />;
    case 'record':
      return <RecordScene {...props} />;
    case 'integration':
      return <IntegrationScene {...props} />;
    case 'tech':
      return <TechScene {...props} />;
    case 'revenue':
      return <RevenueScene {...props} />;
    case 'investment':
      return <InvestmentScene {...props} />;
    case 'protection':
      return <ProtectionScene {...props} />;
    case 'kpis':
      return <KpiScene {...props} />;
    case 'statement':
      return <StatementScene {...props} />;
    case 'cta':
      return <CtaScene {...props} />;
    case 'close':
      return <CloseScene {...props} />;
    default:
      return null;
  }
}

// ─── Shared pieces ───────────────────────────────────────────────────

function Stage({
  children,
  className,
  glow = true,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly glow?: boolean;
}) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      {glow && (
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[80vmin] w-[80vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-[120px]"
        />
      )}
      <EdgeVignette />
      <Grain />
      <div
        className={`relative flex h-full w-full flex-col items-center justify-center px-5 pb-20 pt-10 md:px-[6vw] ${className ?? ''}`}
      >
        {children}
      </div>
    </div>
  );
}

function Kicker({
  children,
  delay = 0,
  big,
  className,
}: {
  readonly children: ReactNode;
  readonly delay?: number;
  readonly big?: boolean;
  readonly className?: string;
}) {
  return (
    <motion.p
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease: EASE }}
      className={`font-heading font-semibold uppercase tracking-[0.42em] text-primary ${
        big ? 'text-[clamp(11px,1.5vw,1.6rem)]' : 'text-[clamp(10px,1.05vw,0.95rem)]'
      } ${className ?? ''}`}
    >
      {children}
    </motion.p>
  );
}

function Headline({
  children,
  delay = 0.1,
  className,
}: {
  readonly children: ReactNode;
  readonly delay?: number;
  readonly className?: string;
}) {
  return (
    <motion.h2
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay, ease: EASE }}
      className={`font-heading font-light uppercase leading-[1.02] text-white ${className ?? ''}`}
    >
      {children}
    </motion.h2>
  );
}

/** A delay that lands item `i` of `n` inside the first `spread` of the scene. */
function stagger(i: number, n: number, seconds: number, start = 0.6, spread = 0.6): number {
  return start + (i * (seconds * spread - start)) / Math.max(1, n);
}

function useCountUp(target: number, ms: number, delayMs = 0): number {
  const reduced = useReducedMotion() ?? false;
  const [value, setValue] = useState(reduced ? target : 0);
  useEffect(() => {
    if (reduced) return;
    let frame = 0;
    const startAt = performance.now() + delayMs;
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - startAt) / ms));
      setValue(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, ms, delayMs, reduced]);
  return value;
}

// ─── Scenes ──────────────────────────────────────────────────────────

function ColdScene({ scene, seconds, paused, big }: SceneProps) {
  const lines = scene.lines ?? [];
  const step = useStep(lines.length, seconds, paused);
  const line = lines[step] ?? '';
  return (
    <Stage glow={false}>
      <PulseRing key={step} count={2} size="34vmin" />
      <motion.p
        key={line}
        initial={{ opacity: 0, letterSpacing: '0.7em', filter: 'blur(8px)' }}
        animate={{ opacity: 1, letterSpacing: '0.32em', filter: 'blur(0px)' }}
        transition={{ duration: 1.1, ease: EASE }}
        className={`text-center font-heading font-light text-white ${
          big ? 'text-[clamp(1.6rem,5.6vw,6.5rem)]' : 'text-[clamp(1.3rem,4.4vw,4rem)]'
        }`}
      >
        {line}
      </motion.p>
    </Stage>
  );
}

function TitleScene({ big }: SceneProps) {
  return (
    <Stage>
      <PulseRing delay={0.3} count={2} size="40vmin" />
      <motion.img
        src="/shesa.png"
        alt=""
        initial={{ opacity: 0, scale: 0.8, rotate: -8 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: 'spring', duration: 1.1, bounce: 0.25 }}
        className={`${big ? 'h-[22vmin] w-[22vmin]' : 'h-[18vmin] w-[18vmin]'} object-contain drop-shadow-[0_0_6vmin_rgba(200,16,60,0.45)]`}
      />
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.5, ease: EASE }}
        className={`mt-[3vmin] text-center font-heading font-light uppercase leading-none tracking-[0.12em] text-white ${
          big ? 'text-[clamp(2.6rem,10vw,12rem)]' : 'text-[clamp(2.4rem,8.5vw,8.5rem)]'
        }`}
      >
        SHESA <span className="text-primary">Digital</span>
      </motion.h1>
      <Kicker delay={1.2} big={big} className="mt-[2.4vmin] text-center">
        Six platforms · One digital institution
      </Kicker>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 2 }}
        className={`mt-[1.6vmin] text-center font-heading uppercase tracking-[0.3em] text-white/45 ${
          big ? 'text-[clamp(10px,1.3vw,1.4rem)]' : 'text-[clamp(9px,0.95vw,0.85rem)]'
        }`}
      >
        Aligned with the 2026 – 2030 Strategic Plan
      </motion.p>
    </Stage>
  );
}

function PillarsScene({ seconds }: SceneProps) {
  return (
    <Stage>
      <Kicker>The 2026 – 2030 Strategic Plan</Kicker>
      <Headline className="mt-3 text-center text-[clamp(1.4rem,3.6vw,3.4rem)]">
        The platforms <span className="text-primary">are</span> the plan
      </Headline>
      <div className="mt-[5vmin] grid w-full max-w-[1500px] grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
        {PILLARS.map((p, i) => (
          <motion.div
            key={p.n}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: stagger(i, 4, seconds, 1, 0.5), ease: EASE }}
            className="relative overflow-hidden border-t-2 border-primary bg-white/[0.04] p-4 md:min-h-[30vh] md:p-[3vmin]"
          >
            <span className="pointer-events-none absolute -right-2 -top-4 font-heading text-[clamp(4rem,9vw,9rem)] font-light leading-none text-white/[0.06]">
              {p.n}
            </span>
            <p className="font-heading text-[clamp(10px,0.9vw,0.85rem)] font-semibold uppercase tracking-[0.3em] text-primary">
              Pillar {p.n}
            </p>
            <p className="mt-2 font-heading text-[clamp(0.9rem,1.9vw,2rem)] font-light leading-snug text-white">
              {p.name}
            </p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: stagger(i, 4, seconds, 1, 0.5) + seconds * 0.25 }}
              className="mt-4 border-t border-white/10 pt-3 font-heading text-[clamp(9px,0.85vw,0.8rem)] uppercase tracking-[0.18em] text-white/60"
            >
              <span className="text-white/35">Delivered by </span>
              {p.by}
            </motion.p>
          </motion.div>
        ))}
      </div>
    </Stage>
  );
}

function ProblemsScene({ seconds }: SceneProps) {
  return (
    <Stage>
      <Kicker>What the plan acknowledges → what the platforms change</Kicker>
      <div className="mt-[4vmin] flex w-full max-w-6xl flex-col gap-[2vmin]">
        {PROBLEMS.map((row, i) => {
          const d = stagger(i, PROBLEMS.length, seconds, 0.5, 0.7);
          return (
            <motion.div
              key={row.problem}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: d, ease: EASE }}
              className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-white/10 pb-[2vmin] md:gap-8"
            >
              <span className="relative font-heading text-[clamp(0.85rem,2vw,2rem)] font-light uppercase text-white/45">
                {row.problem}
                <motion.span
                  aria-hidden
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.5, delay: d + 1.1, ease: EASE }}
                  className="absolute left-0 top-1/2 h-[2px] w-full origin-left bg-primary"
                />
              </span>
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: d + 1.3 }}
              >
                <ArrowRight className="h-[3vmin] w-[3vmin] text-primary" aria-hidden />
              </motion.span>
              <motion.span
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: d + 1.4, ease: EASE }}
                className="font-heading text-[clamp(0.85rem,2vw,2rem)] font-light uppercase text-white"
              >
                {row.answer}
              </motion.span>
            </motion.div>
          );
        })}
      </div>
    </Stage>
  );
}

function ProofScene({ seconds }: SceneProps) {
  const n = useCountUp(300, 2200, 400);
  return (
    <Stage>
      <Kicker>Proof of demand</Kicker>
      <div className="relative mt-[2vmin]">
        <PulseRing delay={2.5} count={2} size="40vmin" />
        <p className="font-heading text-[clamp(6rem,24vw,22rem)] font-light leading-[0.85] tabular-nums text-white">
          {Math.round(n)}
          <span className="text-primary">+</span>
        </p>
      </div>
      <Headline
        delay={1.2}
        className="mt-[2vmin] max-w-4xl text-center text-[clamp(1rem,2.4vw,2.2rem)] !leading-[1.25]"
      >
        Shesans in the mentorship database —{' '}
        <span className="text-primary">before any platform existed</span>
      </Headline>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: seconds * 0.55, duration: 1 }}
        className="mt-[3vmin] font-heading text-[clamp(10px,1.1vw,1rem)] uppercase tracking-[0.3em] text-white/55"
      >
        Day one: 300 verified profiles, ready to import
      </motion.p>
    </Stage>
  );
}

function EcosystemScene({ seconds, big }: SceneProps) {
  const reduced = useReducedMotion() ?? false;
  const n = PLATFORMS.length;
  const nodes = PLATFORMS.map((p, i) => {
    const a = (-90 + (i * 360) / n) * (Math.PI / 180);
    return { p, x: 50 + 38 * Math.cos(a), y: 50 + 38 * Math.sin(a) };
  });
  return (
    <Stage className="!pb-14 !pt-6">
      <div className="relative aspect-square h-[min(84vh,92vw)]">
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
          <motion.circle
            cx="50"
            cy="50"
            r="38"
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="0.25"
            strokeDasharray="0.8 1.2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.6, ease: EASE }}
          />
          {nodes.map(({ p, x, y }, i) => (
            <g key={p.id}>
              <motion.line
                x1="50"
                y1="50"
                x2={x}
                y2={y}
                stroke="rgba(200,16,60,0.55)"
                strokeWidth="0.3"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, delay: stagger(i, n, seconds, 0.8, 0.55), ease: EASE }}
              />
              {!reduced && (
                <motion.circle
                  r="0.7"
                  fill="#ff2d55"
                  initial={{ cx: x, cy: y, opacity: 0 }}
                  animate={{ cx: [x, 50], cy: [y, 50], opacity: [0, 1, 0] }}
                  transition={{
                    duration: 1.4,
                    delay: stagger(i, n, seconds, 0.8, 0.55) + 1,
                    repeat: Infinity,
                    repeatDelay: 1.6,
                  }}
                />
              )}
            </g>
          ))}
        </svg>
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', duration: 1, bounce: 0.3 }}
          className="absolute left-1/2 top-1/2 flex h-[28%] w-[28%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-primary/50 bg-black/80 text-center shadow-[0_0_8vmin_rgba(200,16,60,0.35)]"
        >
          <img src="/shesa.png" alt="" className="h-[45%] w-[45%] object-contain" />
          <span
            className={`mt-1 font-heading font-semibold uppercase tracking-[0.2em] text-white/80 ${
              big ? 'text-[clamp(8px,1.1vmin,1rem)]' : 'text-[clamp(7px,0.9vmin,0.8rem)]'
            }`}
          >
            One member record
          </span>
        </motion.div>
        {nodes.map(({ p, x, y }, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.6,
              delay: stagger(i, n, seconds, 0.8, 0.55) + 0.5,
              ease: EASE,
            }}
            className="absolute flex w-[30%] -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <span className="grid h-[5.2vmin] w-[5.2vmin] place-items-center rounded-full bg-primary font-heading text-[clamp(10px,1.7vmin,1.4rem)] font-semibold text-white shadow-[0_0_4vmin_rgba(200,16,60,0.6)]">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span
              className={`mt-[1vmin] font-heading font-light uppercase tracking-[0.08em] text-white ${
                big ? 'text-[clamp(0.8rem,2.7vmin,2.4rem)]' : 'text-[clamp(0.75rem,2.3vmin,1.8rem)]'
              }`}
            >
              {p.name}
            </span>
            <span className="font-heading text-[clamp(7px,1.25vmin,0.9rem)] uppercase tracking-[0.22em] text-white/45">
              {p.kicker}
            </span>
          </motion.div>
        ))}
      </div>
    </Stage>
  );
}

function PlatformDevice({
  platform,
  seconds,
  paused,
}: {
  readonly platform: Platform;
  readonly seconds: number;
  readonly paused: boolean;
}) {
  if (platform.id === 'connect') {
    return (
      <div className="relative flex h-full items-center justify-center">
        <PhoneFrame className="h-[min(74vh,120vw)]">
          <ConnectMock seconds={seconds} paused={paused} />
          <PreviewTag />
        </PhoneFrame>
      </div>
    );
  }
  if (platform.id === 'store') {
    return (
      <BrowserFrame url={platform.url} className="w-full">
        <StoreMock seconds={seconds} paused={paused} />
        <PreviewTag corner="bottom-left" />
      </BrowserFrame>
    );
  }
  return (
    <div className="relative w-full">
      <BrowserFrame url={platform.url} className="w-full">
        <ShotReel shots={platform.browserShots} seconds={seconds} paused={paused} />
      </BrowserFrame>
      {platform.phoneShots.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.8, ease: EASE }}
          className="absolute -bottom-[6%] -right-[4%] w-[24%]"
        >
          <PhoneFrame className="w-full">
            <ShotReel shots={platform.phoneShots} seconds={seconds} paused={paused} />
          </PhoneFrame>
        </motion.div>
      )}
    </div>
  );
}

function PlatformScene({
  platform,
  seconds,
  paused,
  big,
}: SceneProps & { readonly platform: Platform }) {
  const index = PLATFORMS.indexOf(platform) + 1;
  const isPhone = platform.device === 'phone';
  return (
    <Stage className="!items-stretch">
      <div
        className={`grid h-full w-full items-center gap-6 md:gap-[4vw] ${
          isPhone ? 'md:grid-cols-[1.25fr_1fr]' : 'md:grid-cols-[0.78fr_1.5fr]'
        }`}
      >
        <div className="relative order-2 md:order-1">
          <motion.span
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, ease: EASE }}
            className="pointer-events-none absolute -left-[1vw] -top-[14vmin] hidden select-none font-heading text-[26vmin] font-light leading-none text-white/[0.05] md:block"
          >
            {String(index).padStart(2, '0')}
          </motion.span>
          <Kicker big={big}>
            {String(index).padStart(2, '0')} / 06 · {platform.kicker}
          </Kicker>
          <Headline
            delay={0.25}
            className={`mt-[1.4vmin] ${big ? 'text-[clamp(2rem,5.6vw,7rem)]' : 'text-[clamp(1.8rem,4.4vw,4.6rem)]'}`}
          >
            {platform.name}
          </Headline>
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7, type: 'spring', bounce: 0.3 }}
            className={`mt-[1.6vmin] inline-flex items-center gap-2 rounded-full border border-primary/60 bg-primary/10 px-3 py-1 font-heading font-semibold uppercase tracking-[0.22em] text-white/85 ${
              big ? 'text-[clamp(10px,1.1vw,1.1rem)]' : 'text-[clamp(9px,0.8vw,0.75rem)]'
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {platform.status}
          </motion.span>

          {big ? (
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 1.1, ease: EASE }}
              className="mt-[4vmin] font-heading text-[clamp(1.3rem,3.2vw,4rem)] font-light uppercase leading-[1.05] text-white"
            >
              {platform.venueLine[0]}
              <br />
              <span className="text-primary">{platform.venueLine[1]}</span>
            </motion.p>
          ) : (
            <>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.9 }}
                className="mt-[2.4vmin] max-w-xl font-sans text-[clamp(0.9rem,1.45vw,1.5rem)] font-light leading-snug text-white/75"
              >
                {platform.tagline}
              </motion.p>
              <ul className="mt-[3vmin] flex flex-col gap-[1.3vmin]">
                {platform.features.map((f, i) => (
                  <motion.li
                    key={f}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: 0.6,
                      delay: stagger(i, platform.features.length, seconds, 1.4, 0.75),
                      ease: EASE,
                    }}
                    className="flex items-start gap-3 font-sans text-[clamp(0.8rem,1.2vw,1.25rem)] font-light text-white"
                  >
                    <Check
                      className="mt-[0.2em] h-[1.1em] w-[1.1em] shrink-0 text-primary"
                      aria-hidden
                    />
                    {f}
                  </motion.li>
                ))}
              </ul>
            </>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40, rotateX: 8 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 1.1, delay: 0.2, ease: EASE }}
          className={`order-1 flex items-center justify-center md:order-2 ${isPhone ? 'h-[46vh] md:h-full' : ''}`}
          style={{ perspective: 1200 }}
        >
          <PlatformDevice platform={platform} seconds={seconds} paused={paused} />
        </motion.div>
      </div>
    </Stage>
  );
}

function RecordScene({ seconds, big }: SceneProps) {
  const r = MEMBER_RECORD;
  const facts = big ? r.facts.slice(0, 3) : r.facts;
  return (
    <Stage>
      <div className="grid w-full max-w-7xl items-center gap-8 md:grid-cols-2 md:gap-[5vw]">
        <div>
          <Kicker big={big}>The centralised member database</Kicker>
          <Headline
            className={`mt-3 ${big ? 'text-[clamp(2rem,5vw,6rem)]' : 'text-[clamp(1.6rem,3.8vw,3.8rem)]'}`}
          >
            One Shesan.
            <br />
            <span className="text-primary">One record.</span>
          </Headline>
          <ul className="mt-[3vmin] flex flex-col gap-[1.4vmin]">
            {facts.map((f, i) => (
              <motion.li
                key={f}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.6,
                  delay: stagger(i, facts.length, seconds, 1, 0.6),
                  ease: EASE,
                }}
                className={`flex items-start gap-3 font-sans font-light text-white/85 ${
                  big ? 'text-[clamp(0.9rem,1.8vw,2rem)]' : 'text-[clamp(0.8rem,1.25vw,1.25rem)]'
                }`}
              >
                <Check
                  className="mt-[0.2em] h-[1.1em] w-[1.1em] shrink-0 text-primary"
                  aria-hidden
                />
                {f}
              </motion.li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-[min(680px,44vw)]">
          <motion.div
            initial={{ opacity: 0, rotateY: 70 }}
            animate={{ opacity: 1, rotateY: 0 }}
            transition={{ duration: 1.1, delay: 0.4, ease: EASE }}
            style={{ transformPerspective: 1200 }}
            className="relative overflow-hidden rounded-[2vmin] bg-gradient-to-br from-[#b8123a] via-[#8a0d2c] to-[#2a0410] p-[3.4vmin] shadow-[0_4vmin_10vmin_-3vmin_rgba(200,16,60,0.6)]"
          >
            <img
              src="/shesa.png"
              alt=""
              className="pointer-events-none absolute -bottom-[25%] -right-[8%] h-[70%] w-[70%] object-contain opacity-[0.1]"
            />
            <div className="flex items-center gap-3">
              <img src="/shesa.png" alt="" className="h-[7vmin] w-[7vmin] object-contain" />
              <div>
                <p className="font-heading text-[clamp(8px,1.2vmin,0.9rem)] font-semibold uppercase tracking-[0.3em] text-white/70">
                  Sacred Heart Ex-Students&apos; Association
                </p>
                <p className="font-heading text-[clamp(9px,1.5vmin,1rem)] uppercase tracking-[0.2em] text-white">
                  Member record
                </p>
              </div>
            </div>
            <p className="mt-[4vmin] font-heading text-[clamp(1.2rem,4vmin,3rem)] font-light text-white">
              {r.name}
            </p>
            <p className="font-sans text-[clamp(0.75rem,1.9vmin,1.2rem)] text-white/75">
              {r.house} · {r.batch} · {r.branch}
            </p>
            <div className="mt-[3vmin] grid grid-cols-[1.5fr_1fr_1fr] gap-3 border-t border-white/20 pt-[2vmin] font-sans text-white">
              {[
                ['Matricule', r.matricule],
                ['Year in', r.yearIn],
                ['Year out', r.yearOut],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="text-[clamp(7px,1.2vmin,0.8rem)] uppercase tracking-[0.2em] text-white/55">
                    {k}
                  </p>
                  <p className="whitespace-nowrap font-mono text-[clamp(0.7rem,1.9vmin,1.5rem)] tracking-wide">
                    {v}
                  </p>
                </div>
              ))}
            </div>
            <motion.span
              initial={{ opacity: 0, scale: 1.6, rotate: -12 }}
              animate={{ opacity: 1, scale: 1, rotate: -6 }}
              transition={{ type: 'spring', duration: 0.6, bounce: 0.3, delay: 1.6 }}
              className="absolute right-[3vmin] top-[40%] flex items-center gap-1.5 rounded-full border-2 border-white px-3 py-1 font-heading text-[clamp(8px,1.4vmin,1rem)] font-semibold uppercase tracking-[0.2em] text-white"
            >
              <ShieldCheck className="h-[1.2em] w-[1.2em]" aria-hidden /> Verified
            </motion.span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: seconds * 0.55 }}
            className="absolute -bottom-[14%] left-[6%] right-[6%] flex items-center gap-3 rounded-[1.2vmin] border border-amber-400/40 bg-neutral-950/95 p-[1.6vmin] font-sans text-[clamp(0.7rem,1.6vmin,1.05rem)] text-white/85 shadow-xl"
          >
            <TriangleAlert className="h-[1.4em] w-[1.4em] shrink-0 text-amber-400" aria-hidden />
            Duplicate blocked: {r.matricule} is already registered.
          </motion.div>
        </div>
      </div>
    </Stage>
  );
}

function IntegrationScene({ seconds }: SceneProps) {
  const reduced = useReducedMotion() ?? false;
  return (
    <Stage>
      <Kicker>Integration</Kicker>
      <Headline className="mt-3 text-center text-[clamp(1.4rem,3.6vw,3.4rem)]">
        One ecosystem. <span className="text-primary">No gaps.</span>
      </Headline>
      <div className="mt-[5vmin] flex w-full max-w-6xl flex-col gap-[2.6vmin]">
        {FLOWS.map((f, i) => {
          const d = stagger(i, FLOWS.length, seconds, 0.8, 0.6);
          return (
            <motion.div
              key={f.what}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: d, ease: EASE }}
              className="grid grid-cols-[1fr_1.4fr_1fr] items-center gap-3"
            >
              <span className="rounded-full border border-white/20 bg-white/[0.04] px-3 py-2 text-center font-heading text-[clamp(0.7rem,1.3vw,1.25rem)] uppercase tracking-[0.12em] text-white">
                {f.from}
              </span>
              <span className="relative flex flex-col items-center">
                <span className="mb-1 font-heading text-[clamp(8px,0.9vw,0.85rem)] uppercase tracking-[0.25em] text-white/55">
                  {f.what}
                </span>
                <span className="relative h-[2px] w-full overflow-hidden bg-white/10">
                  <motion.span
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.8, delay: d + 0.3 }}
                    className="absolute inset-0 origin-left bg-primary/50"
                  />
                  {!reduced && (
                    <motion.span
                      initial={{ left: '-10%' }}
                      animate={{ left: '105%' }}
                      transition={{
                        duration: 1.3,
                        delay: d + 0.8,
                        repeat: Infinity,
                        repeatDelay: 0.6,
                        ease: 'easeInOut',
                      }}
                      className="absolute top-1/2 h-[6px] w-[8%] -translate-y-1/2 rounded-full bg-[#ff2d55] shadow-[0_0_12px_#ff2d55]"
                    />
                  )}
                </span>
              </span>
              <span className="rounded-full border border-primary/60 bg-primary/15 px-3 py-2 text-center font-heading text-[clamp(0.7rem,1.3vw,1.25rem)] uppercase tracking-[0.12em] text-white">
                {f.to}
              </span>
            </motion.div>
          );
        })}
      </div>
    </Stage>
  );
}

function TechScene({ seconds }: SceneProps) {
  return (
    <Stage>
      <Kicker>Capabilities</Kicker>
      <Headline className="mt-3 text-center text-[clamp(1.4rem,3.6vw,3.4rem)]">
        Production-grade. <span className="text-primary">Not a prototype.</span>
      </Headline>
      <div className="mt-[5vmin] grid w-full max-w-6xl grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {TECH.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.5,
              delay: stagger(i, TECH.length, seconds, 0.8, 0.6),
              ease: EASE,
            }}
            className="border border-white/10 bg-white/[0.035] p-4 md:p-[2.2vmin]"
          >
            <p className="font-heading text-[clamp(0.95rem,1.7vw,1.6rem)] font-light text-white">
              {t.name}
            </p>
            <p className="mt-1 font-heading text-[clamp(8px,0.85vw,0.8rem)] uppercase tracking-[0.2em] text-white/50">
              {t.role}
            </p>
          </motion.div>
        ))}
      </div>
    </Stage>
  );
}

function RevenueScene({ seconds }: SceneProps) {
  const max = Math.max(...REVENUE.years.map((y) => y.net));
  return (
    <Stage>
      <Kicker>Revenue model</Kicker>
      <Headline className="mt-3 text-center text-[clamp(1.4rem,3.4vw,3.2rem)]">
        The platform <span className="text-primary">pays for itself</span>
      </Headline>
      <div className="mt-[4vmin] grid w-full max-w-7xl items-end gap-8 md:grid-cols-[1.3fr_1fr]">
        <div className="flex h-[36vh] items-end gap-[3%] border-b border-white/20">
          {REVENUE.years.map((y, i) => {
            const d = stagger(i, 4, seconds, 0.8, 0.55);
            return (
              <div key={y.label} className="flex h-full flex-1 flex-col items-center justify-end">
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: d + 0.8 }}
                  className="mb-2 font-heading text-[clamp(0.85rem,1.9vw,1.9rem)] font-light tabular-nums text-white"
                >
                  {y.net === 0 ? '0' : `${y.net}M`}
                </motion.span>
                <motion.span
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(1.5, (y.net / max) * 78)}%` }}
                  transition={{ duration: 1, delay: d, ease: EASE }}
                  className={`w-full ${i === 0 ? 'bg-white/20' : 'bg-gradient-to-t from-[#5c0a20] to-primary'}`}
                />
              </div>
            );
          })}
        </div>
        <div className="flex flex-col gap-1">
          <p className="font-heading text-[clamp(9px,0.85vw,0.8rem)] font-semibold uppercase tracking-[0.3em] text-white/50">
            Eight streams from Year 3
          </p>
          {REVENUE.streams.map((s, i) => (
            <motion.p
              key={s}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: seconds * 0.45 + i * 0.12 }}
              className="border-b border-white/[0.07] py-[0.5vmin] font-sans text-[clamp(0.75rem,1.1vw,1.1rem)] font-light text-white/85"
            >
              {s}
            </motion.p>
          ))}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: seconds * 0.45 + 1.2 }}
            className="pt-1 font-sans text-[clamp(0.75rem,1.1vw,1.1rem)] font-medium text-primary"
          >
            {REVENUE.plus}
          </motion.p>
        </div>
      </div>
      <div className="mt-3 grid w-full max-w-7xl md:grid-cols-[1.3fr_1fr]">
        <div className="flex gap-[3%]">
          {REVENUE.years.map((y) => (
            <div key={y.label} className="flex-1 text-center">
              <p className="font-heading text-[clamp(9px,1vw,0.95rem)] font-semibold uppercase tracking-[0.2em] text-white">
                {y.label}
              </p>
              <p className="font-heading text-[clamp(7px,0.75vw,0.75rem)] uppercase tracking-[0.15em] text-white/45">
                {y.note} · {formatXaf(y.users)} users
              </p>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-2 font-heading text-[clamp(8px,0.75vw,0.75rem)] uppercase tracking-[0.25em] text-white/35">
        Net surplus to SHESA, millions of XAF · projection
      </p>
    </Stage>
  );
}

function InvestmentScene({ seconds }: SceneProps) {
  const total = useCountUp(INVESTMENT.total, 2400, Math.round(seconds * 380));
  return (
    <Stage>
      <Kicker>The investment</Kicker>
      <div className="mt-[4vmin] flex w-full max-w-6xl flex-col">
        {INVESTMENT.rows.map((r) => (
          <motion.div
            key={r.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.6, ease: EASE }}
            className="border-b border-white/15 pb-[2.4vmin]"
          >
            <p className="font-heading text-[clamp(1.2rem,2.8vw,2.8rem)] font-light uppercase text-white">
              {r.label}
            </p>
            <p className="mt-2 font-sans text-[clamp(0.75rem,1.15vw,1.15rem)] font-light text-white/55">
              {r.detail}
            </p>
          </motion.div>
        ))}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: seconds * 0.3 }}
          className="relative flex flex-wrap items-end justify-between gap-6 pt-[4vmin] md:flex-nowrap"
        >
          <div>
            <p className="font-heading text-[clamp(10px,1.1vw,1.05rem)] font-semibold uppercase tracking-[0.35em] text-primary">
              {INVESTMENT.label}
            </p>
            <p className="mt-2 font-heading text-[clamp(2rem,5vw,5rem)] font-light uppercase leading-none tracking-[0.06em] text-white">
              {INVESTMENT.phase}
            </p>
          </div>
          <p className="font-heading text-[clamp(2.4rem,6.2vw,7rem)] font-light leading-none tabular-nums whitespace-nowrap text-white">
            <span className="text-white/45">~</span>
            {formatXaf(total)}
            <span className="ml-2 text-[0.3em] text-white/55">XAF</span>
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: seconds * 0.6, duration: 0.8 }}
          className="mt-[4vmin] flex flex-wrap justify-between gap-3 font-heading text-[clamp(8px,0.9vw,0.85rem)] uppercase tracking-[0.22em] text-white/55"
        >
          <span>Paid against delivered milestones</span>
          <span>{INVESTMENT.benchmark}</span>
        </motion.div>
      </div>
    </Stage>
  );
}

function LiveScene({ seconds }: SceneProps) {
  return (
    <Stage>
      <Kicker>Not a promise</Kicker>
      <Headline className="mt-3 text-center text-[clamp(1.6rem,4vw,4rem)]">
        Already <span className="text-primary">live</span>
      </Headline>
      <div className="mt-[5vmin] grid w-full max-w-[1500px] gap-4 md:grid-cols-3 md:gap-6">
        {LIVE_NOW.map((p, i) => {
          const d = stagger(i, LIVE_NOW.length, seconds, 1, 0.55);
          return (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: d, ease: EASE }}
              className="relative overflow-hidden border border-white/10 bg-white/[0.04] p-5 md:p-[3vmin]"
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/50 bg-emerald-400/10 px-3 py-1 font-heading text-[clamp(9px,0.85vw,0.8rem)] font-semibold uppercase tracking-[0.25em] text-emerald-300">
                <motion.span
                  animate={{ opacity: [1, 0.25, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                  className="h-2 w-2 rounded-full bg-emerald-400"
                />
                Live
              </span>
              <p className="mt-[2.4vmin] font-heading text-[clamp(1.2rem,2.4vw,2.4rem)] font-light uppercase leading-tight text-white">
                {p.name}
              </p>
              <p className="mt-1 font-sans text-[clamp(0.7rem,1vw,1rem)] text-white/45">
                {p.where}
              </p>
              <ul className="mt-[2.4vmin] flex flex-col gap-[1vmin]">
                {p.points.map((pt, k) => (
                  <motion.li
                    key={pt}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: d + 0.6 + k * 0.25 }}
                    className="flex items-start gap-2 font-sans text-[clamp(0.8rem,1.2vw,1.2rem)] font-light text-white/85"
                  >
                    <Check
                      className="mt-[0.2em] h-[1.05em] w-[1.05em] shrink-0 text-primary"
                      aria-hidden
                    />
                    {pt}
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          );
        })}
      </div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: seconds * 0.7, duration: 1 }}
        className="mt-[4vmin] text-center font-heading text-[clamp(10px,1.05vw,1rem)] uppercase tracking-[0.3em] text-white/55"
      >
        3 of 6 platforms in production · real members · real payments
      </motion.p>
    </Stage>
  );
}

function TractionScene({ seconds }: SceneProps) {
  const actual = useCountUp(TRACTION.actual, 2600, Math.round(seconds * 350));
  return (
    <Stage>
      <Kicker>Ahead of plan</Kicker>
      <Headline className="mt-3 text-center text-[clamp(1.4rem,3.4vw,3.4rem)]">
        Our projections were <span className="text-primary">too cautious</span>
      </Headline>
      <div className="mt-[6vmin] grid w-full max-w-[1500px] items-end gap-8 md:grid-cols-[0.7fr_1.3fr] md:gap-[4vw]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9, ease: EASE }}
          className="text-center"
        >
          <p className="font-heading text-[clamp(10px,1.05vw,1rem)] font-semibold uppercase tracking-[0.3em] text-white/50">
            Projected · Year 1
          </p>
          <p className="relative mt-3 inline-block font-heading text-[clamp(3rem,9vw,9rem)] font-light leading-none tabular-nums text-white/40">
            {TRACTION.projected}
            <span className="ml-2 text-[0.3em]">XAF</span>
            <motion.span
              aria-hidden
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.5, delay: seconds * 0.3, ease: EASE }}
              className="absolute left-[-6%] top-1/2 h-[3px] w-[112%] origin-left bg-primary"
            />
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: seconds * 0.32, ease: EASE }}
          className="relative text-center"
        >
          <PulseRing delay={seconds * 0.35 + 2.4} count={2} size="30vmin" />
          <p className="font-heading text-[clamp(10px,1.05vw,1rem)] font-semibold uppercase tracking-[0.3em] text-primary">
            Actual · first two months
          </p>
          <p className="mt-3 font-heading text-[clamp(2.6rem,7.4vw,8rem)] whitespace-nowrap font-light leading-none tabular-nums text-white">
            <span className="text-white/45">~</span>
            {formatXaf(actual)}
            <span className="ml-2 text-[0.3em] text-white/55">XAF</span>
          </p>
        </motion.div>
      </div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: seconds * 0.62, duration: 1 }}
        className="mt-[5vmin] max-w-3xl text-center font-sans text-[clamp(0.85rem,1.4vw,1.4rem)] font-light text-white/75"
      >
        Collected through the platform {TRACTION.window}, by mobile money and card.
      </motion.p>
    </Stage>
  );
}

function ProtectionScene({ seconds }: SceneProps) {
  return (
    <Stage>
      <Kicker>Risk mitigation</Kicker>
      <Headline className="mt-3 text-center text-[clamp(1.4rem,3.4vw,3.2rem)]">
        SHESA is protected <span className="text-primary">at every step</span>
      </Headline>
      <div className="mt-[5vmin] grid w-full max-w-6xl grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        {PROTECTIONS.map((p, i) => (
          <motion.div
            key={p.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.6,
              delay: stagger(i, PROTECTIONS.length, seconds, 0.8, 0.65),
              ease: EASE,
            }}
            className="flex gap-3 border border-white/10 bg-white/[0.035] p-4 md:p-[2.2vmin]"
          >
            <ShieldCheck className="mt-0.5 h-[3vmin] w-[3vmin] shrink-0 text-primary" aria-hidden />
            <div>
              <p className="font-heading text-[clamp(0.85rem,1.5vw,1.45rem)] font-light uppercase text-white">
                {p.title}
              </p>
              <p className="mt-1 font-sans text-[clamp(0.7rem,1vw,1rem)] font-light text-white/60">
                {p.body}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </Stage>
  );
}

function KpiScene({ seconds }: SceneProps) {
  return (
    <Stage>
      <Kicker>The 2026 – 2030 KPIs</Kicker>
      <div className="mt-[3vmin] w-full max-w-6xl">
        {KPIS.map((k, i) => {
          const d = stagger(i, KPIS.length, seconds, 0.6, 0.7);
          return (
            <motion.div
              key={k.kpi}
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: d, ease: EASE }}
              className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-white/10 py-[1.25vmin] md:grid-cols-[auto_1.4fr_1fr_auto] md:gap-6"
            >
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 font-heading text-[clamp(8px,0.8vw,0.75rem)] font-semibold tracking-[0.15em] text-white/70">
                {k.goal}
              </span>
              <span className="font-sans text-[clamp(0.75rem,1.2vw,1.2rem)] font-light text-white">
                {k.kpi}
              </span>
              <span className="hidden font-heading text-[clamp(8px,0.85vw,0.8rem)] uppercase tracking-[0.15em] text-white/50 md:block">
                {k.by}
              </span>
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', bounce: 0.5, delay: d + 0.5 }}
                className="grid h-[2.8vmin] min-h-5 w-[2.8vmin] min-w-5 place-items-center rounded-full bg-primary"
              >
                <Check className="h-[65%] w-[65%] text-white" aria-hidden />
              </motion.span>
            </motion.div>
          );
        })}
      </div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: seconds * 0.8 }}
        className="mt-[3vmin] text-center font-heading text-[clamp(0.85rem,1.6vw,1.6rem)] font-light uppercase tracking-[0.1em] text-white"
      >
        Every platform KPI in the Strategy. <span className="text-primary">Delivered.</span>
      </motion.p>
    </Stage>
  );
}

function StatementScene({ scene, big }: SceneProps) {
  const [line, accent] = scene.lines ?? ['', ''];
  const size = big ? 'text-[clamp(2rem,7vw,9rem)]' : 'text-[clamp(1.9rem,6vw,6rem)]';
  return (
    <Stage>
      <PulseRing delay={0.5} size="36vmin" />
      <motion.p
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: EASE }}
        className={`text-center font-heading font-light uppercase leading-[0.98] text-white ${size}`}
      >
        {line}
      </motion.p>
      <motion.p
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.45, ease: EASE }}
        className={`text-center font-heading font-light uppercase leading-[0.98] text-primary ${size}`}
      >
        {accent}
      </motion.p>
    </Stage>
  );
}

function CtaScene({ qrSvg }: SceneProps) {
  const actions = [
    'Get your AGM ticket',
    'Vote in the SHESA awards',
    'Order the new uniform',
    'Read the Strategic Plan',
  ];
  return (
    <Stage>
      <div className="grid w-full max-w-[1500px] items-center gap-10 md:grid-cols-[1.5fr_1fr]">
        <div className="min-w-0">
          <Kicker big>Live today</Kicker>
          <Headline className="mt-3 text-[clamp(1.6rem,3.7vw,5.2rem)]">
            shesa<span className="text-primary">connect</span>.com
          </Headline>
          <ul className="mt-[4vmin] flex flex-col gap-[1.6vmin]">
            {actions.map((a, i) => (
              <motion.li
                key={a}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 1 + i * 0.5, ease: EASE }}
                className="flex items-center gap-4 font-heading text-[clamp(1rem,2.3vw,2.8rem)] font-light uppercase text-white"
              >
                <ArrowRight className="h-[0.9em] w-[0.9em] text-primary" aria-hidden />
                {a}
              </motion.li>
            ))}
          </ul>
        </div>
        {qrSvg && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', duration: 0.9, bounce: 0.25, delay: 0.6 }}
            className="mx-auto flex w-[min(28vw,50vh)] flex-col items-center gap-3"
          >
            <div
              className="w-full rounded-[2vmin] bg-white p-[2vmin] [&>svg]:h-auto [&>svg]:w-full"
              // Generated on the server from a constant URL; no user input.
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <p className="font-heading text-[clamp(10px,1.3vw,1.4rem)] font-semibold uppercase tracking-[0.35em] text-white/70">
              Scan to visit
            </p>
          </motion.div>
        )}
      </div>
    </Stage>
  );
}

function CloseScene({ seconds, big }: SceneProps) {
  const lines = ['One Shesan.', 'One record.', 'One institution.'];
  const size = big ? 'text-[clamp(1.8rem,5.4vw,7rem)]' : 'text-[clamp(1.6rem,4.6vw,4.8rem)]';
  const step = Math.min(1.1, seconds * 0.12);
  return (
    <Stage>
      {lines.map((l, i) => (
        <motion.p
          key={l}
          initial={{ opacity: 0, y: 20, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.9, delay: 0.3 + i * step, ease: EASE }}
          className={`text-center font-heading font-light uppercase leading-[1.05] ${
            i === 2 ? 'text-primary' : 'text-white'
          } ${size}`}
        >
          {l}
        </motion.p>
      ))}
      {/* The association's own motto, in the website hero's script. */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.5 + 3 * step, ease: EASE }}
        className={`mt-[2vmin] text-center font-script leading-none text-white/90 ${
          big ? 'text-[clamp(2rem,5vw,6.5rem)]' : 'text-[clamp(1.8rem,4vw,4.4rem)]'
        }`}
      >
        One SHESA, <span className="text-primary">One Dream</span>
      </motion.p>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: Math.min(4.5, seconds * 0.55), duration: 1 }}
        className="mt-[4vmin] flex flex-col items-center gap-2"
      >
        <img src="/shesa.png" alt="" className="h-[8vmin] w-[8vmin] object-contain" />
        <p className="font-heading text-[clamp(10px,1.2vw,1.2rem)] font-semibold uppercase tracking-[0.4em] text-white">
          SHESA Digital
        </p>
        <p className="font-heading text-[clamp(8px,0.85vw,0.85rem)] uppercase tracking-[0.3em] text-white/45">
          Built by Shesans, for Shesans
        </p>
      </motion.div>
    </Stage>
  );
}
