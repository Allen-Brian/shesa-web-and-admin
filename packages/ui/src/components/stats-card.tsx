import * as React from 'react';

interface StatsCardProps {
  label: string;
  value: number | string;
}

export function StatsCard({ label, value }: StatsCardProps) {
  return (
    <div
      className="flex min-w-[200px] flex-1 flex-col justify-center gap-2 overflow-hidden rounded-lg border px-[18px] py-3 pl-3"
      style={{
        background:
          'radial-gradient(298.84% 218.25% at 97.67% 103.47%, rgba(255,255,255,0.05) 0%, color-mix(in srgb, var(--color-primary) 5%, transparent) 100%), var(--color-card)',
        borderColor: 'var(--color-border)',
      }}
    >
      <p className="truncate whitespace-nowrap text-[24px] font-medium leading-5 text-foreground">
        {value}
      </p>
      <p className="whitespace-nowrap text-[14px] font-normal leading-5 text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
