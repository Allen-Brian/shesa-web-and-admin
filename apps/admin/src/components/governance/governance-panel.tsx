'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { ConfirmDialog, toast } from '@shesa/ui';

import {
  removePosition,
  revokeRole,
  type ActionResult,
} from '@/app/(personas)/exco/clusters/branches/governance-actions';

import { AssignPositionDialog, type GovernanceMemberPickerRow } from './assign-position-dialog';
import { CreatePositionDialog, type PositionScopeType } from './create-position-dialog';
import { GrantRoleDialog } from './grant-role-dialog';
import { PositionsTable } from './positions-table';
import { RolesPanel } from './roles-panel';
import type {
  GovernancePositionCatalogRow,
  GovernancePositionHolderRow,
  GovernanceRoleHolderRow,
} from './governance-types';

export type {
  GovernancePositionCatalogRow,
  GovernancePositionHolderRow,
  GovernanceRoleHolderRow,
} from './governance-types';

interface GovernancePanelProps {
  readonly scopeId: string;
  readonly scopeLabel: string;
  /**
   * `scope_type` for the catalog behind this table. The catalog is
   * federation-wide by scope_type, so a Mainstream admin creating a new
   * "Sports Coordinator" for scope_type='branch' surfaces it on every
   * branch's governance table at once.
   */
  readonly scopeType: PositionScopeType;
  readonly positionCatalog: readonly GovernancePositionCatalogRow[];
  readonly positionHolders: readonly GovernancePositionHolderRow[];
  readonly roleHolders: readonly GovernanceRoleHolderRow[];
  readonly memberPicker: readonly GovernanceMemberPickerRow[];
  readonly canManage: boolean;
  /** True only when the caller can extend the catalog (Mainstream admin). */
  readonly canCreatePositions: boolean;
  readonly emptyCatalogHint?: string;
  readonly emptyRolesHint?: string;
}

/**
 * Orchestrator for the governance surface — hosts the positions table,
 * the standalone-roles list, and the shared assign/grant/confirm
 * dialogs. All data-shape work is done upstream; this file only wires
 * event handlers.
 */
export function GovernancePanel({
  scopeId,
  scopeLabel,
  scopeType,
  positionCatalog,
  positionHolders,
  roleHolders,
  memberPicker,
  canManage,
  canCreatePositions,
  emptyCatalogHint,
  emptyRolesHint,
}: GovernancePanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [assignFor, setAssignFor] = useState<GovernancePositionCatalogRow | null>(null);
  const [grantOpen, setGrantOpen] = useState(false);
  const [grantForMemberId, setGrantForMemberId] = useState<string | null>(null);
  const [createPositionOpen, setCreatePositionOpen] = useState(false);
  const [confirmPos, setConfirmPos] = useState<GovernancePositionHolderRow | null>(null);
  const [confirmRole, setConfirmRole] = useState<GovernanceRoleHolderRow | null>(null);

  const positionLinkedUserIds = useMemo(() => {
    const set = new Set<string>();
    for (const h of positionHolders) if (h.authUserId) set.add(h.authUserId);
    return set;
  }, [positionHolders]);

  const nextSortOrder = useMemo(() => {
    if (positionCatalog.length === 0) return 10;
    const max = positionCatalog.reduce((acc, c) => Math.max(acc, c.sort_order), 0);
    return Math.floor(max / 10) * 10 + 10;
  }, [positionCatalog]);

  const doAction = (label: string, fn: () => Promise<ActionResult>) => {
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        toast.error(result.message ?? `Could not ${label}.`);
        return;
      }
      if (result.warning) toast.warning(result.warning);
      toast.success(`${label} — done.`);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <PositionsTable
        scopeLabel={scopeLabel}
        positionCatalog={positionCatalog}
        positionHolders={positionHolders}
        roleHolders={roleHolders}
        canManage={canManage}
        canCreate={canCreatePositions}
        onCreate={() => setCreatePositionOpen(true)}
        emptyHint={emptyCatalogHint ?? 'No position catalog exists for this scope yet.'}
        onAssignMember={setAssignFor}
        onRemoveHolder={setConfirmPos}
        onGrantRole={(holder) => {
          setGrantForMemberId(holder.memberId);
          setGrantOpen(true);
        }}
        onRevokeRole={setConfirmRole}
      />

      <RolesPanel
        scopeLabel={scopeLabel}
        roleHolders={roleHolders}
        excludeUserIds={positionLinkedUserIds}
        canManage={canManage}
        emptyHint={emptyRolesHint ?? 'No standalone roles at this scope.'}
        onGrantRole={() => {
          setGrantForMemberId(null);
          setGrantOpen(true);
        }}
        onRevokeRole={setConfirmRole}
      />

      {assignFor && (
        <AssignPositionDialog
          open
          onOpenChange={(o) => !o && setAssignFor(null)}
          scopeId={scopeId}
          scopeLabel={scopeLabel}
          position={assignFor}
          members={memberPicker}
        />
      )}

      <GrantRoleDialog
        open={grantOpen}
        onOpenChange={(o) => {
          setGrantOpen(o);
          if (!o) setGrantForMemberId(null);
        }}
        scopeId={scopeId}
        scopeLabel={scopeLabel}
        members={memberPicker}
        initialMemberId={grantForMemberId}
      />

      {canCreatePositions && (
        <CreatePositionDialog
          open={createPositionOpen}
          onOpenChange={setCreatePositionOpen}
          scopeType={scopeType}
          nextSortOrder={nextSortOrder}
        />
      )}

      <ConfirmDialog
        open={!!confirmPos}
        title={confirmPos ? `Remove ${confirmPos.memberName} from ${confirmPos.positionName}?` : ''}
        description="The badge disappears immediately. Their role, if any, stays — revoke it separately if needed."
        confirmLabel="Remove"
        onConfirm={() => {
          if (!confirmPos) return;
          const target = confirmPos;
          setConfirmPos(null);
          doAction('Position removed', () => removePosition(target.assignmentId));
        }}
        onCancel={() => setConfirmPos(null)}
      />

      <ConfirmDialog
        open={!!confirmRole}
        title={confirmRole ? `Revoke ${confirmRole.roleKey} from ${confirmRole.userLabel}?` : ''}
        description="They lose portal access immediately. Position assignment, if any, stays — remove it separately if needed."
        confirmLabel="Revoke"
        onConfirm={() => {
          if (!confirmRole) return;
          const target = confirmRole;
          setConfirmRole(null);
          doAction('Role revoked', () => revokeRole(target.assignmentId));
        }}
        onCancel={() => setConfirmRole(null)}
      />

      {pending && <span className="sr-only">Working…</span>}
    </div>
  );
}
