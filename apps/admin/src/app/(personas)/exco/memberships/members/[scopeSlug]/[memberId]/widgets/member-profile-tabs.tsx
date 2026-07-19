'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shesa/ui';

import { MemberProfileHistoryItem } from './member-profile-history-item';
import type { MembershipHistoryRow } from './member-profile-types';
import { ProfileEmptyCard } from './profile-empty-card';
import { ProfileRegistrationCard } from './profile-registration-card';

interface MemberProfileTabsProps {
  readonly tab: 'overview' | 'admin';
  readonly onTabChange: (v: 'overview' | 'admin') => void;
  readonly currentAffiliation: MembershipHistoryRow | null;
  readonly history: readonly MembershipHistoryRow[];
}

/**
 * Center column — Overview / Admin activities tabs. Overview shows the
 * current-registration card plus the full membership history list.
 * Admin tab is a placeholder pending the audit-viewer epic.
 */
export function MemberProfileTabs({
  tab,
  onTabChange,
  currentAffiliation,
  history,
}: MemberProfileTabsProps) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <Tabs value={tab} onValueChange={(v) => onTabChange(v as 'overview' | 'admin')}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="admin">Admin activities</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="flex flex-col gap-4">
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Registration status (current)
            </h3>
            {currentAffiliation ? (
              <ProfileRegistrationCard row={currentAffiliation} />
            ) : (
              <ProfileEmptyCard label="No active membership." />
            )}
          </div>

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Membership history
            </h3>
            {history.length === 0 ? (
              <ProfileEmptyCard label="No membership history yet." />
            ) : (
              <ul className="flex flex-col gap-2">
                {history.map((h) => (
                  <MemberProfileHistoryItem key={h.id} row={h} />
                ))}
              </ul>
            )}
          </div>
        </TabsContent>

        <TabsContent value="admin" className="flex flex-col gap-2">
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Audit log slice for this member lands with the audit-viewer epic. The Server Component
            reads audit.audit_events joined to the target member id.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
