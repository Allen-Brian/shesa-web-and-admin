import type { LucideIcon } from 'lucide-react';

export interface EventRow {
  readonly id: string;
  readonly name: string;
  readonly ownerScopeId: string;
  readonly ownerScopeName: string;
  readonly types: readonly string[];
  readonly startAt: string;
  readonly endAt: string;
  readonly timezone: string;
  readonly mode: 'physical' | 'online' | 'hybrid';
  readonly status: string;
  readonly venueName: string | null;
  readonly onlineUrl: string | null;
  readonly createdAt: string | null;
  readonly publishedAt: string | null;
  readonly membersReached: number;
  readonly [key: string]: unknown;
}

export type SerialRow = EventRow & { readonly serial: number };

export type ConfirmState = null | {
  readonly kind: 'archive' | 'delete';
  readonly targets: readonly SerialRow[];
};

export type ModeFilter = 'all' | 'physical' | 'online' | 'hybrid';

export interface StatusDescriptor {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly className: string;
}

export interface ModeDescriptor {
  readonly icon: LucideIcon;
  readonly label: string;
}
