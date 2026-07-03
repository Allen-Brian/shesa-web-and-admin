'use client';

import { useState } from 'react';
import { Inbox, ArrowLeftRight } from 'lucide-react';

import { Button } from '@shesa/ui';

import { RequestsPanel } from './requests-panel';
import { TransfersPanel } from './transfers-panel';

export interface SwitcherScope {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly scope_type: 'branch' | 'chapter';
}

export interface RequestRow {
  readonly membership_id: string;
  readonly member_id: string;
  readonly full_name: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly batch_name: string | null;
  readonly join_method: string;
  readonly requested_at: string;
}

export interface TransferRow {
  readonly transfer_id: string;
  readonly member_id: string;
  readonly full_name: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly batch_name: string | null;
  readonly source_scope_name: string;
  readonly source_scope_slug: string;
  readonly reason: string | null;
  readonly requested_at: string;
}

interface SwitcherProps {
  readonly scope: SwitcherScope;
  readonly requests: readonly RequestRow[];
  readonly transfers: readonly TransferRow[];
}

type Panel = 'requests' | 'transfers';

/**
 * The ONE place tabs appear inside Memberships — the internal switcher
 * between the Requests queue and the incoming Transfers queue. Both
 * queues live at the same scope and share the same header, so a chip
 * toggle beats separate URLs here (matches the spec: "one page, two
 * switcher panels").
 *
 * URL is not changed on toggle — the spec accepts local state here.
 */
export function RequestsTransfersSwitcher({ scope, requests, transfers }: SwitcherProps) {
  const [panel, setPanel] = useState<Panel>(
    requests.length === 0 && transfers.length > 0 ? 'transfers' : 'requests',
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Memberships · {scope.scope_type === 'chapter' ? 'Autonomous chapter' : 'Branch'}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {scope.name} · Requests & Transfers
        </h1>
        <p className="font-mono text-xs text-muted-foreground">{scope.slug}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip
          active={panel === 'requests'}
          onClick={() => setPanel('requests')}
          count={requests.length}
          label="Requests"
          Icon={Inbox}
        />
        <Chip
          active={panel === 'transfers'}
          onClick={() => setPanel('transfers')}
          count={transfers.length}
          label="Transfers"
          Icon={ArrowLeftRight}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {panel === 'requests' ? (
          <RequestsPanel requests={requests} />
        ) : (
          <TransfersPanel transfers={transfers} />
        )}
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  count,
  label,
  Icon,
}: {
  readonly active: boolean;
  readonly onClick: () => void;
  readonly count: number;
  readonly label: string;
  readonly Icon: typeof Inbox;
}) {
  return (
    <Button
      type="button"
      variant={active ? 'default' : 'outline'}
      size="sm"
      onClick={onClick}
      className="gap-2"
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
      <span
        className={
          active
            ? 'rounded-md bg-primary-foreground/20 px-1.5 py-0.5 text-xs font-mono'
            : 'rounded-md bg-muted px-1.5 py-0.5 text-xs font-mono text-muted-foreground'
        }
      >
        {count}
      </span>
    </Button>
  );
}
