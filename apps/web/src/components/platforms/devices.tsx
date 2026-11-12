'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Bell,
  Briefcase,
  CalendarDays,
  Check,
  CheckCircle2,
  CreditCard,
  Home,
  Lock,
  MessageCircle,
  Package,
  Search,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Truck,
  User,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

import type { Shot } from './platforms-content';

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];
const CREST = '/shesa.png';

/**
 * Cycles through `count` steps over `seconds`, one step per equal share.
 * Paused freezes the step where it is. Used by every animated mockup and
 * by the screenshot reel, so they all stay in time with the scene.
 */
export function useStep(count: number, seconds: number, paused: boolean): number {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (paused || count <= 1 || step >= count - 1) return;
    const id = window.setTimeout(() => setStep((s) => s + 1), (seconds * 1000) / count);
    return () => window.clearTimeout(id);
  }, [count, seconds, paused, step]);
  return step;
}

// ─── Frames ──────────────────────────────────────────────────────────

export function BrowserFrame({
  url,
  children,
  className,
}: {
  readonly url?: string;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[0.9vmin] border border-white/15 bg-neutral-900 shadow-[0_3vmin_8vmin_-2vmin_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.04)] ${className ?? ''}`}
    >
      <div className="flex h-[3.4vmin] min-h-5 items-center gap-[0.8vmin] border-b border-white/10 bg-neutral-800/90 px-[1.2vmin]">
        <span className="h-[0.9vmin] min-h-1.5 w-[0.9vmin] min-w-1.5 rounded-full bg-[#ff5f57]" />
        <span className="h-[0.9vmin] min-h-1.5 w-[0.9vmin] min-w-1.5 rounded-full bg-[#febc2e]" />
        <span className="h-[0.9vmin] min-h-1.5 w-[0.9vmin] min-w-1.5 rounded-full bg-[#28c840]" />
        {url && (
          <span className="mx-auto flex max-w-[60%] items-center gap-[0.6vmin] truncate rounded-full bg-black/40 px-[1.4vmin] py-[0.3vmin] font-sans text-[max(9px,1.2vmin)] text-white/60">
            <Lock className="h-[1.1vmin] min-h-2 w-[1.1vmin] min-w-2 shrink-0" aria-hidden />
            {url}
          </span>
        )}
      </div>
      <div className="relative aspect-[16/10] overflow-hidden bg-white">{children}</div>
    </div>
  );
}

export function PhoneFrame({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <div
      className={`relative aspect-[9/19] overflow-hidden rounded-[4.2vmin] border-[0.8vmin] border-neutral-800 bg-neutral-900 shadow-[0_3vmin_8vmin_-2vmin_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.12)] ${className ?? ''}`}
    >
      <div className="absolute inset-0 overflow-hidden rounded-[3.4vmin] bg-white">{children}</div>
      <span className="absolute left-1/2 top-[1.1vmin] z-10 h-[2.2vmin] w-[28%] -translate-x-1/2 rounded-full bg-black" />
    </div>
  );
}

/** The small tag that marks a drawn mockup as a design, not a capture. */
export function PreviewTag({
  corner = 'top-right',
}: {
  readonly corner?: 'top-right' | 'bottom-left';
}) {
  return (
    <span
      className={`absolute z-20 rounded-full ${
        corner === 'top-right' ? 'right-[1.2vmin] top-[1.2vmin]' : 'bottom-[1.2vmin] left-[1.2vmin]'
      } bg-black/75 px-[1.2vmin] py-[0.4vmin] font-heading text-[max(8px,1.05vmin)] font-semibold uppercase tracking-[0.2em] text-white/80 backdrop-blur-sm`}
    >
      Design preview
    </span>
  );
}

// ─── Screenshot reel ─────────────────────────────────────────────────

/**
 * Real screenshots, one after another, sharing the scene's time.
 *
 * A `scroll` shot is a full-page capture: it is pinned top and pans to
 * the bottom over its share, which reads as someone scrolling the live
 * page. A `still` is a single screen, held with a very slow push-in so
 * it does not sit dead on a giant display.
 */
export function ShotReel({
  shots,
  seconds,
  paused,
}: {
  readonly shots: readonly Shot[];
  readonly seconds: number;
  readonly paused: boolean;
}) {
  const reduced = useReducedMotion() ?? false;
  const step = useStep(shots.length, seconds, paused);
  const shot = shots[Math.min(step, shots.length - 1)];
  const share = seconds / Math.max(1, shots.length);
  if (!shot) return null;

  return (
    <AnimatePresence initial={false}>
      <motion.div
        key={shot.src}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="absolute inset-0"
      >
        {shot.motion === 'scroll' ? (
          <motion.img
            src={shot.src}
            alt=""
            draggable={false}
            className="h-full w-full object-cover"
            initial={{ objectPosition: '50% 0%' }}
            animate={paused || reduced ? undefined : { objectPosition: '50% 100%' }}
            transition={{ duration: share * 0.92, ease: [0.45, 0, 0.55, 1], delay: share * 0.06 }}
          />
        ) : (
          <motion.img
            src={shot.src}
            alt=""
            draggable={false}
            className="h-full w-full object-cover object-top"
            initial={{ scale: 1 }}
            animate={paused || reduced ? undefined : { scale: 1.06 }}
            transition={{ duration: share + 0.6, ease: 'linear' }}
            style={{ originX: 0.3, originY: 0.2 }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// ─── SHESA Connect (drawn) ───────────────────────────────────────────

const CONNECT_SCREENS = ['feed', 'profile', 'chat', 'pay'] as const;

/**
 * The mobile app, drawn. Four screens in turn: the feed, a verified
 * profile on its matricule, a chat, and dues paid by mobile money.
 */
export function ConnectMock({
  seconds,
  paused,
}: {
  readonly seconds: number;
  readonly paused: boolean;
}) {
  const step = useStep(CONNECT_SCREENS.length, seconds, paused);
  const screen = CONNECT_SCREENS[step] ?? 'feed';
  const share = seconds / CONNECT_SCREENS.length;

  return (
    <div className="absolute inset-0 flex flex-col bg-[#f6f4f5] font-sans text-[max(8px,1.45vmin)] text-neutral-900">
      {/* status bar */}
      <div className="flex h-[4.6vmin] items-end justify-between px-[2.4vmin] pb-[0.5vmin] text-[max(7px,1.2vmin)] font-semibold">
        <span>9:41</span>
        <span className="tracking-widest">● ● ●</span>
      </div>
      {/* app bar */}
      <div className="flex items-center gap-[1vmin] bg-white px-[1.8vmin] py-[1.1vmin] shadow-sm">
        <img src={CREST} alt="" className="h-[3.4vmin] w-[3.4vmin] object-contain" />
        <span className="font-heading text-[max(9px,1.8vmin)] font-bold tracking-tight">
          SHESA <span className="text-primary">Connect</span>
        </span>
        <Search className="ml-auto h-[2.2vmin] w-[2.2vmin] text-neutral-500" aria-hidden />
        <Bell className="h-[2.2vmin] w-[2.2vmin] text-neutral-500" aria-hidden />
      </div>

      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={screen}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="absolute inset-0 overflow-hidden p-[1.4vmin]"
          >
            {screen === 'feed' && <ConnectFeed />}
            {screen === 'profile' && <ConnectProfile />}
            {screen === 'chat' && <ConnectChat share={share} paused={paused} />}
            {screen === 'pay' && <ConnectPay share={share} paused={paused} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* tab bar */}
      <div className="flex justify-around border-t border-neutral-200 bg-white py-[1vmin] text-neutral-400">
        {[
          { icon: Home, on: screen === 'feed' },
          { icon: Briefcase, on: false },
          { icon: MessageCircle, on: screen === 'chat' },
          { icon: CalendarDays, on: screen === 'pay' },
          { icon: User, on: screen === 'profile' },
        ].map(({ icon: Icon, on }, i) => (
          <Icon
            key={i}
            className={`h-[2.4vmin] w-[2.4vmin] ${on ? 'text-primary' : ''}`}
            aria-hidden
          />
        ))}
      </div>
    </div>
  );
}

function Verified() {
  return (
    <ShieldCheck className="inline h-[1.6vmin] w-[1.6vmin] text-primary" aria-label="Verified" />
  );
}

function ConnectFeed() {
  const posts = [
    {
      who: 'National EXCO',
      tag: 'Official',
      body: 'AGM 2026: all roads lead to Palais des Congrès, Yaoundé. 13–15 November.',
      img: '/hero_one.jpg',
    },
    {
      who: 'Mentorship Network',
      tag: 'Jobs',
      body: 'New: Software Engineer, Douala. Shesan-referred applicants first.',
    },
    {
      who: 'Batch 2010',
      tag: 'Batch',
      body: 'Reunion photos are up. Who can name everyone in row two?',
    },
  ];
  return (
    <div className="flex flex-col gap-[1.2vmin]">
      {posts.map((p, i) => (
        <motion.div
          key={p.who}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.15 + i * 0.25, ease: EASE }}
          className="rounded-[1.2vmin] bg-white p-[1.3vmin] shadow-sm"
        >
          <div className="flex items-center gap-[0.8vmin]">
            <span className="grid h-[3.2vmin] w-[3.2vmin] place-items-center rounded-full bg-primary/10 text-[max(7px,1.2vmin)] font-bold text-primary">
              {p.who.charAt(0)}
            </span>
            <span className="font-semibold">{p.who}</span>
            <Verified />
            <span className="ml-auto rounded-full bg-neutral-100 px-[0.8vmin] text-[max(7px,1.1vmin)] text-neutral-500">
              {p.tag}
            </span>
          </div>
          <p className="mt-[0.8vmin] leading-snug text-neutral-700">{p.body}</p>
          {p.img && (
            <img
              src={p.img}
              alt=""
              className="mt-[0.9vmin] h-[11vmin] w-full rounded-[0.8vmin] object-cover"
            />
          )}
        </motion.div>
      ))}
    </div>
  );
}

function ConnectProfile() {
  return (
    <div className="flex flex-col items-center gap-[1.2vmin] pt-[1vmin]">
      <motion.div
        initial={{ rotateY: 90, opacity: 0 }}
        animate={{ rotateY: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: EASE }}
        className="w-full rounded-[1.6vmin] bg-gradient-to-br from-primary to-[#5c0a20] p-[1.8vmin] text-white shadow-lg"
      >
        <div className="flex items-center justify-between">
          <img src={CREST} alt="" className="h-[4.6vmin] w-[4.6vmin] object-contain" />
          <span className="text-[max(7px,1.1vmin)] font-semibold uppercase tracking-[0.25em] text-white/70">
            Member ID
          </span>
        </div>
        <p className="mt-[2vmin] font-heading text-[max(10px,2.3vmin)] font-semibold">
          Ndifon Peter
        </p>
        <p className="text-white/75">St Thomas · Batch 2010</p>
        <p className="mt-[1.6vmin] font-mono text-[max(10px,2.2vmin)] tracking-[0.18em]">
          SH-2010-0417
        </p>
      </motion.div>
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', duration: 0.6, bounce: 0.35, delay: 0.7 }}
        className="flex items-center gap-[0.8vmin] rounded-full bg-white px-[1.6vmin] py-[0.8vmin] font-semibold text-primary shadow-sm"
      >
        <ShieldCheck className="h-[2vmin] w-[2vmin]" aria-hidden /> Verified Shesan
      </motion.div>
      <div className="grid w-full grid-cols-3 gap-[0.8vmin] text-center">
        {[
          ['Branch', 'Yaoundé'],
          ['Network', 'Tech'],
          ['Mentor', 'Yes'],
        ].map(([k, v], i) => (
          <motion.div
            key={k}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 + i * 0.15 }}
            className="rounded-[1vmin] bg-white p-[1vmin] shadow-sm"
          >
            <p className="text-[max(7px,1.1vmin)] text-neutral-500">{k}</p>
            <p className="font-semibold">{v}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ConnectChat({ share, paused }: { readonly share: number; readonly paused: boolean }) {
  const msgs = [
    { me: false, text: 'Welcome to the Tech network! Saw you offered to mentor.' },
    { me: true, text: 'Happy to. Two mentees from Batch 2022 to start?' },
    { me: false, text: 'Perfect. I’ll send the introductions now.' },
    { me: true, text: 'See you at the AGM 👊🏾' },
  ];
  const shown = useStep(msgs.length + 1, share, paused);
  return (
    <div className="flex h-full flex-col">
      <div className="mb-[1vmin] flex items-center gap-[0.8vmin] rounded-[1vmin] bg-white p-[1vmin] shadow-sm">
        <span className="grid h-[3.2vmin] w-[3.2vmin] place-items-center rounded-full bg-primary text-[max(7px,1.2vmin)] font-bold text-white">
          M
        </span>
        <span className="font-semibold">Mentorship Network</span>
        <Verified />
      </div>
      <div className="flex flex-col gap-[0.8vmin]">
        {msgs.slice(0, shown + 1).map((m, i) => (
          <motion.p
            key={i}
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3 }}
            className={`max-w-[80%] rounded-[1.4vmin] px-[1.3vmin] py-[0.8vmin] leading-snug ${
              m.me
                ? 'self-end bg-primary text-white'
                : 'self-start bg-white text-neutral-800 shadow-sm'
            }`}
          >
            {m.text}
          </motion.p>
        ))}
      </div>
    </div>
  );
}

function ConnectPay({ share, paused }: { readonly share: number; readonly paused: boolean }) {
  const stage = useStep(3, share, paused);
  return (
    <div className="flex h-full flex-col gap-[1.2vmin]">
      <div className="rounded-[1.2vmin] bg-white p-[1.6vmin] shadow-sm">
        <p className="text-[max(7px,1.1vmin)] uppercase tracking-[0.2em] text-neutral-500">
          Annual dues 2026
        </p>
        <p className="mt-[0.4vmin] font-heading text-[max(12px,3vmin)] font-semibold">10,000 XAF</p>
        <p className="text-neutral-500">Shesa Yaoundé</p>
      </div>
      {[
        { name: 'MTN MoMo', color: 'bg-[#ffcc00] text-black' },
        { name: 'Orange Money', color: 'bg-[#ff7900] text-white' },
        { name: 'Card', color: 'bg-neutral-800 text-white' },
      ].map((m, i) => (
        <div
          key={m.name}
          className={`flex items-center gap-[1vmin] rounded-[1.2vmin] border-2 bg-white p-[1.2vmin] transition-colors ${
            i === 0 && stage >= 1 ? 'border-primary' : 'border-transparent'
          }`}
        >
          <span
            className={`grid h-[3.4vmin] w-[3.4vmin] place-items-center rounded-[0.8vmin] ${m.color}`}
          >
            {i === 2 ? (
              <CreditCard className="h-[1.8vmin] w-[1.8vmin]" aria-hidden />
            ) : (
              <Smartphone className="h-[1.8vmin] w-[1.8vmin]" aria-hidden />
            )}
          </span>
          <span className="font-semibold">{m.name}</span>
          {i === 0 && stage >= 1 && (
            <Check className="ml-auto h-[2vmin] w-[2vmin] text-primary" aria-hidden />
          )}
        </div>
      ))}
      <AnimatePresence>
        {stage >= 2 ? (
          <motion.div
            key="paid"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', duration: 0.5, bounce: 0.35 }}
            className="mt-auto flex flex-col items-center gap-[0.6vmin] rounded-[1.2vmin] bg-emerald-50 p-[1.6vmin] text-emerald-700"
          >
            <CheckCircle2 className="h-[4vmin] w-[4vmin]" aria-hidden />
            <span className="font-semibold">Paid · receipt sent</span>
            <span className="text-[max(7px,1.1vmin)] text-emerald-700/70">
              Recorded in the Finance ledger
            </span>
          </motion.div>
        ) : (
          <motion.div
            key="btn"
            exit={{ opacity: 0 }}
            className="mt-auto rounded-[1.2vmin] bg-primary py-[1.4vmin] text-center font-semibold text-white"
          >
            Pay 10,000 XAF
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── SHESA Store (drawn) ─────────────────────────────────────────────

/**
 * ⚠ Illustrative catalogue. The uniform's 55,000 XAF is the real AGM
 * price from the website; every other item and price is a placeholder
 * for the design, to be replaced by SHESA's actual catalogue.
 */
const PRODUCTS = [
  { name: 'Assembly Uniform', price: '55,000', art: 'shirt', tone: 'red' },
  { name: 'Crest Polo', price: '12,000', art: 'shirt', tone: 'white' },
  { name: 'Viriliter Cap', price: '6,000', art: 'cap', tone: 'black' },
  { name: 'Heritage Scarf', price: '8,000', art: 'scarf', tone: 'red' },
  { name: 'Anthem Mug', price: '5,000', art: 'mug', tone: 'white' },
  { name: 'SHESA Yearbook', price: '10,000', art: 'book', tone: 'black' },
] as const;

const TONE = {
  red: { fill: '#b8123a', ink: '#ffffff', bg: 'bg-rose-50' },
  white: { fill: '#ffffff', ink: '#b8123a', bg: 'bg-neutral-100' },
  black: { fill: '#161616', ink: '#ffffff', bg: 'bg-neutral-200' },
} as const;

function ProductArt({ art, tone }: { readonly art: string; readonly tone: keyof typeof TONE }) {
  const t = TONE[tone];
  const stroke = tone === 'white' ? '#d4d4d4' : 'none';
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
      {art === 'shirt' && (
        <path
          d="M32 18 L44 13 Q50 20 56 13 L68 18 L84 32 L74 42 L68 37 L68 86 L32 86 L32 37 L26 42 L16 32 Z"
          fill={t.fill}
          stroke={stroke}
          strokeWidth="1.5"
        />
      )}
      {art === 'cap' && (
        <>
          <path d="M22 62 Q22 30 50 30 Q78 30 78 62 Z" fill={t.fill} stroke={stroke} />
          <path d="M14 62 L86 62 Q88 70 70 70 L30 70 Q12 70 14 62 Z" fill={t.fill} opacity="0.85" />
        </>
      )}
      {art === 'scarf' && (
        <>
          <rect x="38" y="10" width="24" height="80" rx="3" fill={t.fill} />
          <rect x="38" y="70" width="24" height="5" fill="#fff" />
          <rect x="38" y="78" width="24" height="5" fill="#161616" />
        </>
      )}
      {art === 'mug' && (
        <>
          <rect
            x="26"
            y="28"
            width="40"
            height="50"
            rx="5"
            fill={t.fill}
            stroke="#d4d4d4"
            strokeWidth="1.5"
          />
          <path d="M66 38 Q82 38 82 52 Q82 66 66 66" fill="none" stroke="#d4d4d4" strokeWidth="5" />
        </>
      )}
      {art === 'book' && (
        <>
          <rect x="28" y="14" width="46" height="72" rx="2" fill={t.fill} />
          <rect x="28" y="14" width="6" height="72" fill="#b8123a" />
          <text
            x="54"
            y="74"
            textAnchor="middle"
            fontSize="7"
            fill="#fff"
            fontFamily="sans-serif"
            letterSpacing="1"
          >
            2026
          </text>
        </>
      )}
      <image
        href={CREST}
        x={art === 'book' ? 40 : art === 'scarf' ? 41 : art === 'cap' ? 40 : 40}
        y={
          art === 'book' ? 30 : art === 'scarf' ? 30 : art === 'cap' ? 38 : art === 'mug' ? 40 : 34
        }
        width={art === 'scarf' ? 18 : 20}
        height={art === 'scarf' ? 18 : 20}
      />
    </svg>
  );
}

const STORE_STAGES = ['browse', 'cart', 'checkout', 'track'] as const;

export function StoreMock({
  seconds,
  paused,
}: {
  readonly seconds: number;
  readonly paused: boolean;
}) {
  const step = useStep(STORE_STAGES.length, seconds, paused);
  const stage = STORE_STAGES[step] ?? 'browse';
  const inCart = step >= 1 ? 1 : 0;

  return (
    <div className="absolute inset-0 flex flex-col bg-white font-sans text-[max(8px,1.3vmin)] text-neutral-900">
      <div className="flex items-center gap-[1.2vmin] border-b border-neutral-200 px-[2.4vmin] py-[1.2vmin]">
        <img src={CREST} alt="" className="h-[3.6vmin] w-[3.6vmin] object-contain" />
        <span className="font-display text-[max(11px,2.4vmin)] tracking-wide">SHESA</span>
        <span className="font-heading text-[max(8px,1.3vmin)] font-semibold uppercase tracking-[0.35em] text-primary">
          Store
        </span>
        <div className="ml-[3vmin] hidden gap-[2vmin] text-neutral-500 md:flex">
          {['Clothing', 'Accessories', 'Publications', 'Stationery'].map((c, i) => (
            <span key={c} className={i === 0 ? 'font-semibold text-neutral-900' : ''}>
              {c}
            </span>
          ))}
        </div>
        <span className="relative ml-auto">
          <ShoppingBag className="h-[2.6vmin] w-[2.6vmin]" aria-hidden />
          <AnimatePresence>
            {inCart > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -right-[0.8vmin] -top-[0.8vmin] grid h-[1.9vmin] w-[1.9vmin] place-items-center rounded-full bg-primary text-[max(7px,1vmin)] font-bold text-white"
              >
                {inCart}
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <div className="grid h-full grid-cols-3 gap-[1.6vmin] p-[2.2vmin]">
          {PRODUCTS.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.1, ease: EASE }}
              className={`flex flex-col overflow-hidden rounded-[1vmin] border ${
                i === 0 && step >= 1
                  ? 'border-primary ring-2 ring-primary/30'
                  : 'border-neutral-200'
              }`}
            >
              <div className={`min-h-0 flex-1 ${TONE[p.tone].bg} p-[1vmin]`}>
                <ProductArt art={p.art} tone={p.tone} />
              </div>
              <div className="flex items-center justify-between px-[1.2vmin] py-[0.8vmin]">
                <span className="truncate font-semibold">{p.name}</span>
                <span className="shrink-0 text-primary">{p.price} XAF</span>
              </div>
            </motion.div>
          ))}
        </div>

        <AnimatePresence>
          {(stage === 'checkout' || stage === 'track') && (
            <motion.div
              key="panel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.5, ease: EASE }}
              className="absolute inset-y-0 right-0 flex w-[46%] flex-col gap-[1.2vmin] border-l border-neutral-200 bg-white p-[2.2vmin] shadow-[-2vmin_0_4vmin_-2vmin_rgba(0,0,0,0.25)]"
            >
              {stage === 'checkout' ? <StoreCheckout /> : <StoreTracking />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function StoreCheckout() {
  return (
    <>
      <p className="font-heading text-[max(10px,1.9vmin)] font-semibold">Checkout</p>
      <div className="flex justify-between border-b border-neutral-200 pb-[1vmin]">
        <span>Assembly Uniform · M</span>
        <span>55,000 XAF</span>
      </div>
      <p className="text-[max(7px,1.1vmin)] uppercase tracking-[0.2em] text-neutral-500">
        Pay with
      </p>
      {[
        { name: 'MTN Mobile Money', c: 'bg-[#ffcc00]' },
        { name: 'Orange Money', c: 'bg-[#ff7900]' },
        { name: 'Visa · Mastercard', c: 'bg-neutral-800' },
      ].map((m, i) => (
        <motion.div
          key={m.name}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 + i * 0.12 }}
          className={`flex items-center gap-[1vmin] rounded-[0.8vmin] border p-[1vmin] ${
            i === 2 ? 'border-primary' : 'border-neutral-200'
          }`}
        >
          <span className={`h-[2.2vmin] w-[3.2vmin] rounded-[0.4vmin] ${m.c}`} />
          {m.name}
          {i === 2 && (
            <Check className="ml-auto h-[1.8vmin] w-[1.8vmin] text-primary" aria-hidden />
          )}
        </motion.div>
      ))}
      <p className="text-neutral-500">Shipping to: London, United Kingdom</p>
      <div className="mt-auto rounded-[0.8vmin] bg-primary py-[1.2vmin] text-center font-semibold text-white">
        Place order
      </div>
    </>
  );
}

function StoreTracking() {
  const steps = [
    { icon: CheckCircle2, label: 'Confirmed', note: 'Payment received' },
    { icon: Package, label: 'Processing', note: 'Packed in Yaoundé' },
    { icon: Truck, label: 'Delivered', note: 'Tracking ref. SHS-48213' },
  ];
  return (
    <>
      <p className="font-heading text-[max(10px,1.9vmin)] font-semibold">Order #1042</p>
      <p className="text-neutral-500">Assembly Uniform · M</p>
      <div className="mt-[1vmin] flex flex-col gap-[1.6vmin]">
        {steps.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0.25 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 + i * 0.7 }}
            className="flex items-center gap-[1.2vmin]"
          >
            <motion.span
              initial={{ backgroundColor: '#e5e5e5' }}
              animate={{ backgroundColor: '#b8123a' }}
              transition={{ delay: 0.4 + i * 0.7 }}
              className="grid h-[3.6vmin] w-[3.6vmin] place-items-center rounded-full text-white"
            >
              <s.icon className="h-[2vmin] w-[2vmin]" aria-hidden />
            </motion.span>
            <span>
              <span className="block font-semibold">{s.label}</span>
              <span className="text-neutral-500">{s.note}</span>
            </span>
          </motion.div>
        ))}
      </div>
      <p className="mt-auto rounded-[0.8vmin] bg-neutral-100 p-[1vmin] text-neutral-600">
        Email sent at every status change.
      </p>
    </>
  );
}
