/**
 * Shared types for the Groups admin surface. Kept in a plain file so
 * the server loader (page.tsx) and every widget sibling import from
 * one source without pulling in each other's runtime.
 */

export type GroupStatus = 'active' | 'closed' | 'archived';

export interface GroupRow {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string | null;
  readonly status: GroupStatus;
  readonly showInSidebar: boolean;
  readonly startsOn: string | null;
  readonly endsOn: string | null;
  readonly createdAt: string;
  /** Roll-up counts computed server-side so the list needs no per-row RPC. */
  readonly chargeCount: number;
  readonly transactionCount: number;
  readonly expenseCount: number;
  /** Sum of settled payments across every charge in the group. */
  readonly raised: number;
  readonly currency: string;
}

export type SerialGroupRow = GroupRow & { readonly serial: number };
export type StatusFilter = 'all' | GroupStatus;

export interface CreateGroupForm {
  slug: string;
  name: string;
  description: string;
  startsOn: string;
  endsOn: string;
  showInSidebar: boolean;
}
