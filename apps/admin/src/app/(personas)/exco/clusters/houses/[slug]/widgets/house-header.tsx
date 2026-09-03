import { BackLink } from '@shesa/ui';
import { Bird, Flame, PawPrint } from 'lucide-react';

interface HouseDetailHeaderProps {
  readonly name: string;
  readonly nickname: string | null;
  readonly colorHex: string;
  readonly colorName: string;
  readonly memberCount: number;
}

// Heraldic sunburst mane — 16 alternating outer/inner points around (100,100).
const LION_MANE_PATH = (() => {
  const spikes = 16;
  const step = 360 / (spikes * 2);
  const outer = 95;
  const inner = 55;
  const parts: string[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const angle = (i * step - 90) * (Math.PI / 180);
    const r = i % 2 === 0 ? outer : inner;
    const x = (100 + Math.cos(angle) * r).toFixed(2);
    const y = (100 + Math.sin(angle) * r).toFixed(2);
    parts.push(`${i === 0 ? 'M' : 'L'}${x} ${y}`);
  }
  parts.push('Z');
  return parts.join(' ');
})();

function LionSilhouette({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <path d={LION_MANE_PATH} fill="currentColor" />
      <circle cx="100" cy="100" r="42" fill="currentColor" fillOpacity="0.55" />
      <circle cx="88" cy="94" r="3.5" fill="currentColor" />
      <circle cx="112" cy="94" r="3.5" fill="currentColor" />
      <path d="M94 116 L106 116 L100 125 Z" fill="currentColor" />
    </svg>
  );
}

function AnimalWatermark({ nickname, className }: { nickname: string | null; className?: string }) {
  const key = (nickname ?? '').toLowerCase();
  if (key.includes('falcon')) return <Bird className={className} strokeWidth={1.2} aria-hidden />;
  if (key.includes('phoenix')) return <Flame className={className} strokeWidth={1.2} aria-hidden />;
  if (key.includes('grizz') || key.includes('bear'))
    return <PawPrint className={className} strokeWidth={1.2} aria-hidden />;
  if (key.includes('lion')) return <LionSilhouette className={className} />;
  return null;
}

export function HouseDetailHeader({
  name,
  nickname,
  colorHex,
  colorName,
  memberCount,
}: HouseDetailHeaderProps) {
  return (
    <div className="flex flex-col gap-3">
      <BackLink href="/exco/clusters/houses" label="Back to houses" />
      <div
        className="relative overflow-hidden rounded-xl p-6 shadow-md sm:p-8"
        style={{
          background: `linear-gradient(135deg, color-mix(in srgb, ${colorHex} 82%, white) 0%, ${colorHex} 45%, color-mix(in srgb, ${colorHex} 55%, black) 100%)`,
        }}
      >
        <div
          className="pointer-events-none absolute -right-6 top-1/2 -translate-y-1/2 sm:-right-4"
          aria-hidden
        >
          <AnimalWatermark
            nickname={nickname}
            className="h-56 w-56 -rotate-6 text-white/15 sm:h-72 sm:w-72"
          />
        </div>

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <h1 className="font-serif text-4xl font-semibold italic tracking-tight text-white drop-shadow-sm sm:text-5xl">
              {name}
            </h1>
            <p className="text-base text-white/85 sm:text-lg">
              {nickname ? (
                <>
                  <span>{nickname}</span>
                  <span className="mx-2 text-white/50">*</span>
                </>
              ) : null}
              <span className="capitalize">{colorName}</span> house
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-start sm:items-end">
            <span className="text-5xl font-bold text-white drop-shadow-sm">{memberCount}</span>
            <span className="text-xs uppercase tracking-widest text-white/70">
              {memberCount === 1 ? 'member' : 'members'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
