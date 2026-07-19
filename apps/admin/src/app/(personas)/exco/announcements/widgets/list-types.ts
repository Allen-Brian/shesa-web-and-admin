import type { LucideIcon } from 'lucide-react';

export interface AnnouncementRow {
  readonly id: string;
  readonly title: string;
  readonly ownerScopeId: string;
  readonly ownerScopeName: string;
  readonly status: string;
  readonly channels: ReadonlyArray<'in_app' | 'email' | 'forum'>;
  readonly createdAt: string | null;
  readonly publishedAt: string | null;
  readonly expiresAt: string | null;
  readonly membersReached: number;
  readonly readCount: number;
  readonly [key: string]: unknown;
}

export type SerialRow = AnnouncementRow & { readonly serial: number };

export type ConfirmState = null | {
  readonly kind: 'archive' | 'delete';
  readonly targets: readonly SerialRow[];
};

export interface StatusDescriptor {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly className: string;
}
