import type {
  GovernancePositionCatalogRow,
  GovernancePositionHolderRow,
  GovernanceRoleHolderRow,
  PositionTableRow,
} from './governance-types';

/**
 * Joins the position catalog with the current holder + their portal
 * role. One output row per catalog entry — vacant positions still
 * render so the operator can see the full slate at a glance.
 *
 * A holder is matched to a role by `authUserId → userId`; multi-role
 * users pick the first hit (rare in practice, and one badge per row
 * keeps the table honest).
 */
export function buildPositionRows(
  catalog: readonly GovernancePositionCatalogRow[],
  holders: readonly GovernancePositionHolderRow[],
  roles: readonly GovernanceRoleHolderRow[],
): PositionTableRow[] {
  const holderByCatalog = new Map<string, GovernancePositionHolderRow>();
  for (const h of holders) {
    if (!holderByCatalog.has(h.positionCatalogId)) holderByCatalog.set(h.positionCatalogId, h);
  }
  const roleByUser = new Map<string, GovernanceRoleHolderRow>();
  for (const r of roles) {
    if (!roleByUser.has(r.userId)) roleByUser.set(r.userId, r);
  }

  return catalog.map((cat, i) => {
    const holder = holderByCatalog.get(cat.id) ?? null;
    const role = holder?.authUserId ? (roleByUser.get(holder.authUserId) ?? null) : null;
    return {
      serial: i + 1,
      positionCatalogId: cat.id,
      position: cat.name,
      description: cat.description,
      holder: holder
        ? {
            assignmentId: holder.assignmentId,
            memberId: holder.memberId,
            memberName: holder.memberName,
            customTitle: holder.customTitle,
            authUserId: holder.authUserId,
          }
        : null,
      role: role
        ? {
            assignmentId: role.assignmentId,
            userId: role.userId,
            roleKey: role.roleKey,
            roleName: role.roleName,
          }
        : null,
    };
  });
}
