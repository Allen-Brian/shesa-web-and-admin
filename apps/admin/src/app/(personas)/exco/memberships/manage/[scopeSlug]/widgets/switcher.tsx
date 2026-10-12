'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shesa/ui';

import { RequestsPanel } from './requests-panel';
import { RegistrationTable, type RegistrationRow } from './registration-table';
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
  readonly registration: readonly RegistrationRow[];
}

/**
 * Manage Membership switcher — three-tab layout using the Tabs
 * primitive that matches the branch-detail page. Default tab picks
 * up the first non-empty queue; Requests wins on tie.
 *
 * Consolidates what used to be two separate routes (Requests &
 * Transfers and Registration) into one page under the new "Manage
 * Membership" sidebar entry.
 */
export function ManageMembershipSwitcher({
  scope,
  requests,
  transfers,
  registration,
}: SwitcherProps) {
  // Tab badge for Registration reflects the "action needed" set — rows
  // where the fee is required but not yet resolved (paid / waived / paid
  // on behalf). The panel's default view filters to this same set.
  const actionNeeded = registration.filter((r) => r.registration_state === 'pending').length;

  const defaultTab =
    requests.length > 0 ? 'requests' : transfers.length > 0 ? 'transfers' : 'registration';

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Memberships · {scope.scope_type === 'chapter' ? 'Autonomous chapter' : 'Branch'}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {scope.name} · Manage Membership
        </h1>
        <p className="text-xs text-muted-foreground">{scope.slug}</p>
      </div>

      <Tabs defaultValue={defaultTab} className="flex min-h-0 flex-1 flex-col gap-4">
        <TabsList className="w-fit">
          <TabsTrigger value="requests">
            Requests
            <span className="ml-1.5 text-xs text-muted-foreground">({requests.length})</span>
          </TabsTrigger>
          <TabsTrigger value="transfers">
            Transfers
            <span className="ml-1.5 text-xs text-muted-foreground">({transfers.length})</span>
          </TabsTrigger>
          <TabsTrigger value="registration">
            Registration
            <span className="ml-1.5 text-xs text-muted-foreground">({actionNeeded})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="flex min-h-0 flex-1 flex-col">
          <RequestsPanel requests={requests} scopeSlug={scope.slug} />
        </TabsContent>

        <TabsContent value="transfers" className="flex min-h-0 flex-1 flex-col">
          <TransfersPanel transfers={transfers} scopeSlug={scope.slug} />
        </TabsContent>

        <TabsContent value="registration" className="flex min-h-0 flex-1 flex-col">
          <RegistrationTable rows={registration} scopeSlug={scope.slug} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
