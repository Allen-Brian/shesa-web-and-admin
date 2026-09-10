export interface SectorRow {
  readonly id: string;
  readonly name: string;
  readonly caption: string | null;
  readonly sortOrder: number;
  readonly leaders: readonly MainstreamLeaderRow[];
}

export interface MainstreamLeaderRow {
  readonly id: string;
  readonly sectorId: string;
  readonly position: string;
  readonly name: string;
  readonly location: string | null;
  readonly photoUrl: string | null;
  readonly profession: string | null;
  readonly bio: string | null;
  readonly email: string | null;
  readonly phone: string | null;
  readonly sortOrder: number;
}

export interface RegionalLeaderRow {
  readonly id: string;
  readonly branchName: string;
  readonly name: string;
  readonly region: string | null;
  readonly photoUrl: string | null;
  /** `president` or `vice_president`. Older rows default to president. */
  readonly role: string;
  readonly profession: string | null;
  readonly bio: string | null;
  readonly email: string | null;
  readonly phone: string | null;
  readonly organId: string | null;
  readonly sortOrder: number;
}

export interface BatchLeaderRow {
  readonly id: string;
  readonly batch: string;
  readonly name: string;
  readonly photoUrl: string | null;
  readonly sortOrder: number;
}
