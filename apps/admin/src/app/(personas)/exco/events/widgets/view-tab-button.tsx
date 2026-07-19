'use client';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface ViewTabButtonProps {
  readonly active: boolean;
  readonly onClick: () => void;
  readonly icon: LucideIcon;
  readonly children: ReactNode;
}

export function ViewTabButton({ active, onClick, icon: Icon, children }: ViewTabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 border-b-2 px-4 py-2 text-sm transition-colors ${
        active
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      }`}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}
