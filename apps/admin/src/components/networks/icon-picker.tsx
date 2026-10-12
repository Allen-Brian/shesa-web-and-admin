'use client';

import { useMemo, useState } from 'react';
import * as LucideIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ChevronDown, Search } from 'lucide-react';

import { Button, Input, Popover, PopoverContent, PopoverTrigger, ScrollArea } from '@shesa/ui';

/**
 * Curated grid of lucide-react keys the create/edit network form can
 * pick from. Kept short on purpose — a 30-icon grid is scannable in
 * a single glance, whereas the full 1500-icon library would need a
 * different UX pattern. Extend the array when a genuinely-new profession
 * needs an icon that isn't visually close to something already listed.
 */
const CURATED_ICONS = [
  'Scale',
  'Gavel',
  'Stethoscope',
  'HeartPulse',
  'Cross',
  'Cpu',
  'Code2',
  'MonitorSmartphone',
  'Landmark',
  'ShieldCheck',
  'GraduationCap',
  'BookOpen',
  'Briefcase',
  'Building2',
  'PenTool',
  'Palette',
  'Music',
  'Camera',
  'Newspaper',
  'Mic',
  'Rocket',
  'Beaker',
  'FlaskConical',
  'Microscope',
  'Truck',
  'Plane',
  'Wrench',
  'Hammer',
  'Sprout',
  'TreePine',
  'Leaf',
  'DollarSign',
  'HandCoins',
  'PiggyBank',
  'Users',
  'Star',
  'Award',
  'Globe',
  'Sparkles',
] as const;

interface IconPickerProps {
  readonly value: string | null;
  readonly onChange: (value: string | null) => void;
  readonly disabled?: boolean;
}

/**
 * Popover-driven icon picker. Trigger renders the currently-selected
 * icon (or a dashed placeholder); the popover shows the curated grid +
 * a text search over the icon keys.
 */
export function IconPicker({ value, onChange, disabled }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CURATED_ICONS;
    return CURATED_ICONS.filter((k) => k.toLowerCase().includes(q));
  }, [query]);

  const CurrentIcon = value ? resolveIcon(value) : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className="w-full justify-between px-3"
        >
          <span className="flex items-center gap-2">
            {CurrentIcon ? (
              <CurrentIcon className="h-4 w-4" />
            ) : (
              <span className="h-4 w-4 rounded border border-dashed border-muted-foreground/50" />
            )}
            <span className="text-sm">{value ?? 'Pick an icon'}</span>
          </span>
          <ChevronDown className="h-4 w-4 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3">
        <div className="flex items-center gap-2 rounded-md border border-border px-2 py-1 transition-[border-color,box-shadow] focus-within:border-(--input-border-hover) focus-within:shadow-(--input-focus-shadow)">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search icons"
            className="h-8 border-0! px-0 shadow-none! focus:border-transparent! focus:shadow-none!"
          />
        </div>
        <ScrollArea className="mt-2 h-56">
          <div className="grid grid-cols-6 gap-1 pr-1">
            {matches.map((key) => {
              const Icon = resolveIcon(key);
              if (!Icon) return null;
              const selected = key === value;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    onChange(key);
                    setOpen(false);
                  }}
                  className={
                    'flex h-10 w-10 items-center justify-center rounded-md border transition-colors ' +
                    (selected
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-transparent text-foreground hover:bg-muted')
                  }
                  aria-label={key}
                  title={key}
                >
                  <Icon className="h-5 w-5" />
                </button>
              );
            })}
            {matches.length === 0 && (
              <p className="col-span-6 py-6 text-center text-sm text-muted-foreground">
                No icons match &quot;{query}&quot;
              </p>
            )}
          </div>
        </ScrollArea>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 h-8 w-full text-xs text-muted-foreground"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
          >
            Clear icon
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

/**
 * Small helper — renders a lucide icon by key, or a placeholder when
 * the key doesn't resolve. Exported so list rows / detail headers /
 * chips can reuse without duplicating the type juggling.
 */
export function NetworkIcon({
  name,
  className,
}: {
  readonly name: string | null;
  readonly className?: string;
}) {
  const Icon = name ? resolveIcon(name) : null;
  if (!Icon) {
    return (
      <span
        aria-hidden
        className={
          'inline-block rounded border border-dashed border-muted-foreground/40 ' +
          (className ?? 'h-4 w-4')
        }
      />
    );
  }
  return <Icon className={className ?? 'h-4 w-4'} />;
}

function resolveIcon(name: string): LucideIcon | null {
  const record = LucideIcons as unknown as Record<string, LucideIcon | undefined>;
  const value = record[name];
  return typeof value === 'function' || typeof value === 'object' ? (value ?? null) : null;
}
