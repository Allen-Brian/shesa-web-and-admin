export type ActionResult<T = unknown> = { ok: true; data?: T } | { ok: false; message: string };

export interface SectorInput {
  readonly name: string;
  readonly caption?: string | null;
  readonly sortOrder: number;
}

export interface MainstreamLeaderInput {
  readonly sectorId: string;
  readonly position: string;
  readonly name: string;
  readonly location?: string | null;
  readonly photoUrl?: string | null;
  /** Profile shown in the modal on the public Leadership page. */
  readonly profession?: string | null;
  readonly bio?: string | null;
  readonly email?: string | null;
  readonly phone?: string | null;
  readonly sortOrder: number;
}

export interface RegionalLeaderInput {
  readonly branchName: string;
  readonly name: string;
  readonly region?: string | null;
  readonly photoUrl?: string | null;
  /** `president` or `vice_president`. Display only — see the column comment. */
  readonly role?: string;
  /** Profile shown in the modal on the public Leadership page. */
  readonly profession?: string | null;
  readonly bio?: string | null;
  readonly email?: string | null;
  readonly phone?: string | null;
  /** The organ this leader heads, so their branch page can show them. */
  readonly organId?: string | null;
  readonly sortOrder: number;
}

export interface BatchLeaderInput {
  readonly batch: string;
  readonly name: string;
  readonly photoUrl?: string | null;
  readonly sortOrder: number;
}
