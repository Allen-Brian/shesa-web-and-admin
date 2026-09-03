export interface GovernancePositionCatalogRow {
  readonly id: string;
  readonly name: string;
  readonly sort_order: number;
  readonly description: string | null;
}

export interface GovernancePositionHolderRow {
  readonly assignmentId: string;
  readonly positionCatalogId: string;
  readonly positionName: string;
  readonly memberId: string;
  readonly memberName: string;
  readonly authUserId: string | null;
  readonly customTitle: string | null;
  readonly startsAt: string;
}

export interface GovernanceRoleHolderRow {
  readonly assignmentId: string;
  readonly userId: string;
  readonly userLabel: string;
  readonly roleKey: string;
  readonly roleName: string;
  readonly startsAt: string;
}

/**
 * Flattened row consumed by the positions DataTable. Built by joining
 * the catalog + holders + role assignments on the client so the table
 * renders one row per catalog position, with the holder and their
 * portal role filled in where available.
 */
export interface PositionTableRow {
  readonly serial: number;
  readonly positionCatalogId: string;
  readonly position: string;
  readonly description: string | null;
  readonly holder: {
    readonly assignmentId: string;
    readonly memberId: string;
    readonly memberName: string;
    readonly customTitle: string | null;
    readonly authUserId: string | null;
  } | null;
  readonly role: {
    readonly assignmentId: string;
    readonly userId: string;
    readonly roleKey: string;
    readonly roleName: string;
  } | null;
}
