'use client';

import { Crown, Plus, Trash2 } from 'lucide-react';

import { Button } from '@shesa/ui';

import type { GovernanceRoleHolderRow } from './governance-types';

interface RolesPanelProps {
  readonly scopeLabel: string;
  readonly roleHolders: readonly GovernanceRoleHolderRow[];
  /** IDs of users already covered by a position's role assignment. */
  readonly excludeUserIds: ReadonlySet<string>;
  readonly canManage: boolean;
  readonly emptyHint: string;
  readonly onGrantRole: () => void;
  readonly onRevokeRole: (role: GovernanceRoleHolderRow) => void;
}

/**
 * Portal-access roles held at this scope that are NOT attached to a
 * position (position-linked roles show up inline in the positions
 * table). Kept as a supplementary list — the common case is empty.
 */
export function RolesPanel(props: RolesPanelProps) {
  const unlinked = props.roleHolders.filter((r) => !props.excludeUserIds.has(r.userId));

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Standalone roles
          </h3>
          <p className="text-xs text-muted-foreground">
            Portal access granted at {props.scopeLabel} outside of a governance position.
          </p>
        </div>
        {props.canManage && (
          <Button type="button" size="sm" variant="outline" onClick={props.onGrantRole}>
            <Plus className="h-4 w-4" />
            Grant role
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card">
        {unlinked.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">{props.emptyHint}</div>
        ) : (
          <ul className="divide-y divide-border">
            {unlinked.map((r) => (
              <li key={r.assignmentId} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400/15 text-amber-600 dark:text-amber-300">
                    <Crown className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">{r.userLabel}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.roleKey} · {r.roleName}
                    </div>
                  </div>
                </div>
                {props.canManage && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => props.onRevokeRole(r)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Revoke
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
