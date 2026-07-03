'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Crown,
  MoreHorizontal,
  Plus,
  ShieldCheck,
  Trash2,
  UserMinus,
  UserPlus,
} from 'lucide-react';

import {
  Badge,
  Button,
  ConfirmDialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  toast,
} from '@shesa/ui';

import { removePosition, revokeRole, type ActionResult } from '../../governance-actions';

import { AssignPositionDialog } from './assign-position-dialog';
import { GrantRoleDialog } from './grant-role-dialog';
import type {
  GovernanceMemberPickerRow,
  PositionCatalogRow,
  PositionHolderRow,
  RoleHolderRow,
} from './detail-view';

interface GovernanceTabProps {
  readonly scopeId: string;
  readonly scopeLabel: string;
  readonly positionCatalog: readonly PositionCatalogRow[];
  readonly positionHolders: readonly PositionHolderRow[];
  readonly roleHolders: readonly RoleHolderRow[];
  readonly memberPicker: readonly GovernanceMemberPickerRow[];
  readonly canManage: boolean;
}

export function GovernanceTab({
  scopeId,
  scopeLabel,
  positionCatalog,
  positionHolders,
  roleHolders,
  memberPicker,
  canManage,
}: GovernanceTabProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [assignFor, setAssignFor] = useState<PositionCatalogRow | null>(null);
  const [grantOpen, setGrantOpen] = useState(false);
  const [confirmPos, setConfirmPos] = useState<PositionHolderRow | null>(null);
  const [confirmRole, setConfirmRole] = useState<RoleHolderRow | null>(null);

  const positionsByCatalog = useMemo(() => {
    const map = new Map<string, PositionHolderRow[]>();
    for (const h of positionHolders) {
      const list = map.get(h.positionCatalogId) ?? [];
      list.push(h);
      map.set(h.positionCatalogId, list);
    }
    return map;
  }, [positionHolders]);

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
      {/* Position holders */}
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Positions
            </h3>
            <p className="text-xs text-muted-foreground">
              The executive slate for {scopeLabel}. Each position can hold one primary member.
            </p>
          </div>
        </div>

        <div className="divide-y divide-border rounded-xl border border-border bg-card">
          {positionCatalog.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No position catalog exists for branches yet.
            </div>
          )}
          {positionCatalog.map((cat) => {
            const holders = positionsByCatalog.get(cat.id) ?? [];
            return (
              <div
                key={cat.id}
                className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">{cat.name}</div>
                    {cat.description && (
                      <div className="text-xs text-muted-foreground">{cat.description}</div>
                    )}
                    {holders.length === 0 ? (
                      <div className="mt-1 text-xs italic text-muted-foreground">Vacant</div>
                    ) : (
                      <ul className="mt-1 space-y-1">
                        {holders.map((h) => (
                          <li
                            key={h.assignmentId}
                            className="flex items-center gap-2 text-sm text-foreground"
                          >
                            <span>{h.memberName}</span>
                            {h.customTitle && (
                              <Badge variant="outline" className="text-xs">
                                {h.customTitle}
                              </Badge>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {canManage && (
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setAssignFor(cat)}
                    >
                      <UserPlus className="h-4 w-4" />
                      Assign
                    </Button>
                    {holders.length > 0 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {holders.map((h) => (
                            <DropdownMenuItem
                              key={h.assignmentId}
                              className="text-destructive focus:text-destructive"
                              onClick={() => setConfirmPos(h)}
                            >
                              <UserMinus className="h-4 w-4" />
                              Remove {h.memberName}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Role holders */}
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Portal access (roles)
            </h3>
            <p className="text-xs text-muted-foreground">
              Members with these roles can sign into the admin portal for {scopeLabel}.
            </p>
          </div>
          {canManage && (
            <Button type="button" size="sm" variant="outline" onClick={() => setGrantOpen(true)}>
              <Plus className="h-4 w-4" />
              Grant role
            </Button>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card">
          {roleHolders.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No roles granted at this branch yet.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {roleHolders.map((r) => (
                <li key={r.assignmentId} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400/15 text-amber-600 dark:text-amber-300">
                      <Crown className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">{r.userLabel}</div>
                      <div className="text-xs text-muted-foreground">
                        <span className="font-mono">{r.roleKey}</span> · {r.roleName}
                      </div>
                    </div>
                  </div>
                  {canManage && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setConfirmRole(r)}
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
        onOpenChange={setGrantOpen}
        scopeId={scopeId}
        scopeLabel={scopeLabel}
        members={memberPicker}
      />

      <ConfirmDialog
        open={!!confirmPos}
        title={confirmPos ? `Remove ${confirmPos.memberName} from ${confirmPos.positionName}?` : ''}
        description="The badge disappears immediately. Their role, if any, stays — revoke it separately if needed."
        confirmLabel="Remove"
        onConfirm={() => {
          if (!confirmPos) return;
          const target = confirmPos;
          setConfirmPos(null);
          doAction('Position removed', () => removePosition(target.assignmentId, scopeId));
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
          doAction('Role revoked', () => revokeRole(target.assignmentId, scopeId));
        }}
        onCancel={() => setConfirmRole(null)}
      />

      {pending && <span className="sr-only">Working…</span>}
    </div>
  );
}
