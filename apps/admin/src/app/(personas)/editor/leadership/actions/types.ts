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
  readonly sortOrder: number;
}

export interface RegionalLeaderInput {
  readonly branchName: string;
  readonly name: string;
  readonly region?: string | null;
  readonly photoUrl?: string | null;
  readonly sortOrder: number;
}

export interface BatchLeaderInput {
  readonly batch: string;
  readonly name: string;
  readonly photoUrl?: string | null;
  readonly sortOrder: number;
}
