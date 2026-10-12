'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, Pencil } from 'lucide-react';

import { Badge, BackLink, Button, ConfirmDialog, toast } from '@shesa/ui';

import { NetworkIcon } from '@/components/networks/icon-picker';
import type { ScopeStatus } from '@/components/clusters/cluster-list';

import { archiveNetwork } from '../../network-actions';
import { NetworkFormDialog } from '../../widgets/form-dialog';
import { buildChipGradient } from '../../widgets/networks-list-view';

interface NetworkDetailHeaderProps {
  readonly scopeId: string;
  readonly name: string;
  readonly slug: string;
  readonly shortName: string;
  readonly description: string | null;
  readonly colorHex: string | null;
  readonly icon: string | null;
  readonly sortOrder: number;
  readonly status: ScopeStatus;
  readonly memberCount: number;
  readonly canUpdate: boolean;
}

export function NetworkDetailHeader({
  scopeId,
  name,
  slug,
  shortName,
  description,
  colorHex,
  icon,
  sortOrder,
  status,
  memberCount,
  canUpdate,
}: NetworkDetailHeaderProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const accent = colorHex ?? '#374151';
  const isArchived = status === 'archived';

  const doArchive = () => {
    startTransition(async () => {
      const result = await archiveNetwork(scopeId);
      if (!result.ok) {
        toast.error(result.message ?? 'Could not archive.');
        return;
      }
      toast.success(`${name} archived.`);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <BackLink href="/exco/clusters/networks" label="Back to networks" />

      <div
        className="flex flex-col gap-4 rounded-xl p-5 sm:flex-row sm:items-center sm:gap-6"
        style={{ backgroundImage: buildChipGradient(accent) }}
      >
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white shadow-inner backdrop-blur-sm"
          aria-hidden
        >
          <NetworkIcon name={icon} className="h-8 w-8" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-white">{name}</h1>
            {isArchived && (
              <Badge variant="outline" className="border-white/40 bg-white/10 text-white">
                Archived
              </Badge>
            )}
          </div>
          <p className="text-sm text-white/80">
            {shortName}
            {description ? ` · ${description}` : ''}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-start text-white sm:items-end">
          <span className="text-3xl font-semibold">{memberCount}</span>
          <span className="text-xs uppercase tracking-wider text-white/80">
            {memberCount === 1 ? 'member' : 'members'}
          </span>
        </div>
      </div>

      {canUpdate && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          {!isArchived && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              loading={pending}
              disabled={pending}
              onClick={() => setConfirmOpen(true)}
              className="text-destructive hover:text-destructive"
            >
              <Archive className="h-4 w-4" />
              {pending ? 'Archiving…' : 'Archive'}
            </Button>
          )}
        </div>
      )}

      <NetworkFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        initial={{
          scopeId,
          name,
          slug,
          shortName,
          description,
          icon,
          colorHex,
          sortOrder,
        }}
      />

      <ConfirmDialog
        open={confirmOpen}
        title={`Archive ${name}?`}
        description="Archived networks disappear from every dropdown. Members currently attached keep their reference until an admin reassigns them."
        confirmLabel="Archive"
        onConfirm={() => {
          setConfirmOpen(false);
          doArchive();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
