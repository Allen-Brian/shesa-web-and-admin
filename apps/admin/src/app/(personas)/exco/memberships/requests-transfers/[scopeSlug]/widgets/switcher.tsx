'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shesa/ui';

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

/**
 * Requests & Transfers switcher — uses the same Tabs primitive the
 * branch-detail page uses so the look-and-feel matches the rest of
 * the admin. Default tab picks up whichever queue has rows (Requests
 * wins on tie).
 */
export function RequestsTransfersSwitcher({ scope, requests, transfers }: SwitcherProps) {
  const defaultTab = requests.length === 0 && transfers.length > 0 ? 'transfers' : 'requests';

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

      <Tabs defaultValue={defaultTab} className="flex min-h-0 flex-1 flex-col gap-4">
        <TabsList>
          <TabsTrigger value="requests">
            Requests
            <span className="ml-1.5 text-xs text-muted-foreground">({requests.length})</span>
          </TabsTrigger>
          <TabsTrigger value="transfers">
            Transfers
            <span className="ml-1.5 text-xs text-muted-foreground">({transfers.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="flex min-h-0 flex-1 flex-col">
          <RequestsPanel requests={requests} />
        </TabsContent>

        <TabsContent value="transfers" className="flex min-h-0 flex-1 flex-col">
          <TransfersPanel transfers={transfers} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
