import type { ScopeStatus } from '@/components/clusters/cluster-list';

export interface BranchRow {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly status: ScopeStatus;
  readonly currency_code: string;
  readonly country_code: string;
  readonly region: string;
  readonly city: string;
  readonly nickname: string | null;
  readonly chapter_count: number;
  readonly autonomous_chapter_count: number;
  readonly member_count: number;
  readonly [key: string]: unknown;
}

export interface ChapterRow {
  readonly id: string;
  readonly parent_id: string;
  readonly name: string;
  readonly slug: string;
  readonly status: ScopeStatus;
  readonly chapter_kind: 'autonomous' | 'grouping';
  readonly country_code: string;
  readonly region: string;
  readonly city: string;
  readonly member_count: number;
}

/**
 * Unified row for AG Grid — discriminated by `_kind`. Chapter rows only
 * appear when their parent branch's disclosure is toggled open.
 */
export interface BranchesSerialRow {
  readonly serial: number | null;
  readonly _kind: 'branch' | 'chapter';
  readonly _parent_id: string | null;
  readonly _parent_slug: string | null;
  readonly _has_children: boolean;
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly status: ScopeStatus;
  readonly country_code: string;
  readonly region: string;
  readonly city: string;
  readonly nickname: string | null;
  readonly chapter_count: number | null;
  readonly member_count: number;
  readonly chapter_kind: 'autonomous' | 'grouping' | null;
  readonly currency_code: string;
}

export type BranchesConfirmState = null | {
  readonly kind: 'archive' | 'restore';
  readonly targets: readonly BranchesSerialRow[];
};
