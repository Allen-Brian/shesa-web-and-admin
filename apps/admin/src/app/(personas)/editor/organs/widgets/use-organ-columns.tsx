'use client';

import { useMemo } from 'react';
import { MapPin, Users } from 'lucide-react';

import type { ColDef, ICellRendererParams } from '@shesa/ui';

import { LeaderAvatar } from '../../leadership/widgets/leader-avatar';
import type { OrganRow } from './organ-widget-types';

export type OrganSerialRow = OrganRow & {
  readonly serial: number;
  readonly sectorName: string;
};

interface Args {
  readonly onOpen: (row: OrganRow) => void;
}

/** Column defs for the Organs DataTable. */
export function useOrganColumns({ onOpen }: Args): ColDef<OrganSerialRow>[] {
  return useMemo<ColDef<OrganSerialRow>[]>(
    () => [
      {
        headerName: 'S/N',
        field: 'serial',
        width: 72,
        maxWidth: 72,
        sortable: false,
        filter: false,
        suppressMovable: true,
      },
      {
        headerName: 'Logo',
        colId: 'logo',
        width: 88,
        sortable: false,
        filter: false,
        suppressMovable: true,
        cellRenderer: (p: ICellRendererParams<OrganSerialRow>) =>
          p.data ? (
            <button
              type="button"
              className="flex h-full items-center"
              onClick={() => onOpen(p.data!)}
            >
              <LeaderAvatar photoUrl={p.data.logoUrl} alt={p.data.name} size={44} />
            </button>
          ) : null,
      },
      {
        headerName: 'Organ',
        field: 'name',
        flex: 2.2,
        minWidth: 220,
        autoHeight: true,
        wrapText: true,
        cellRenderer: (p: ICellRendererParams<OrganSerialRow>) =>
          p.data ? (
            <button
              type="button"
              onClick={() => onOpen(p.data!)}
              className="flex flex-col justify-center py-1 text-left leading-snug"
            >
              <span className="text-sm font-medium text-foreground">{p.data.name}</span>
              <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {p.data.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {p.data.location}
                    {p.data.country ? `, ${p.data.country}` : ''}
                  </span>
                )}
                {p.data.foundedYear && <span>· est. {p.data.foundedYear}</span>}
              </span>
            </button>
          ) : null,
      },
      {
        headerName: 'Sector',
        field: 'sectorName',
        width: 200,
        cellClass: 'text-xs text-muted-foreground',
        valueFormatter: (p) => (p.value ? p.value : '—'),
      },
      {
        headerName: 'Members',
        field: 'memberCount',
        width: 140,
        cellRenderer: (p: ICellRendererParams<OrganSerialRow>) =>
          p.data ? (
            <span className="inline-flex items-center gap-1.5 tabular-nums text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              {p.data.memberCount.toLocaleString()}
            </span>
          ) : null,
      },
    ],
    [onOpen],
  );
}
