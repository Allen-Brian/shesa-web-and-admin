'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeftRight,
  ArrowLeft,
  Ban,
  Check,
  HandCoins,
  Mail,
  MapPin,
  Phone,
  UserMinus,
} from 'lucide-react';

import { Badge, Button, Tabs, TabsContent, TabsList, TabsTrigger } from '@shesa/ui';

import type { ExcoBadgeInfo } from '@/components/governance/exco-badge';
import { MemberName } from '@/components/governance/member-name';

export interface MemberProfile {
  readonly id: string;
  readonly full_name: string;
  readonly badge: ExcoBadgeInfo | null;
  readonly email: string | null;
  readonly phone: string | null;
  readonly batch_year: number | null;
  readonly batch_name: string | null;
  readonly network_name: string | null;
  readonly house_name: string | null;
  readonly current_country: string | null;
  readonly current_region_state: string | null;
  readonly current_city: string | null;
  readonly entry_year: number | null;
  readonly exit_year: number | null;
  readonly member_status: string;
  readonly field: string | null;
}

export interface MembershipHistoryRow {
  readonly id: string;
  readonly scope_id: string;
  readonly scope_name: string;
  readonly scope_slug: string;
  readonly scope_type: string;
  readonly status: string;
  readonly engagement: 'dormant' | 'normal' | 'engaged' | 'committed';
  readonly join_method: string;
  readonly joined_at: string | null;
  readonly approved_at: string | null;
  readonly left_at: string | null;
  readonly transferred_at: string | null;
  readonly registration_state: 'not_required' | 'pending' | 'paid' | 'paid_on_behalf' | 'waived';
  readonly registration_note: string | null;
  readonly is_active: boolean;
}

interface Props {
  readonly viewerScopeSlug: string;
  readonly viewerScopeName: string;
  readonly profile: MemberProfile;
  readonly history: readonly MembershipHistoryRow[];
}

/**
 * Member profile — three-column layout per the M6 spec, matching the
 * design inspiration:
 *   left rail   → sectioned personal info (Contact / Personal / Membership)
 *   center      → tabs (Overview / Admin Activities)
 *   right rail  → Admin Options + Engagement Activity + Household
 *
 * Admin Options are stubs for now — the per-action wiring lands in a
 * follow-up (each already has a permission-key gate concept in the plan).
 * The buttons render always; clicking them toasts "coming soon" so the
 * shape holds while the actions arrive.
 */
export function MemberProfileView({ viewerScopeSlug, viewerScopeName, profile, history }: Props) {
  const [tab, setTab] = useState<'overview' | 'admin'>('overview');

  const currentAffiliation = history.find((h) => h.is_active) ?? null;
  const location = [profile.current_city, profile.current_region_state, profile.current_country]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <Link
        href={`/exco/memberships/members/${viewerScopeSlug}`}
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {viewerScopeName} members
      </Link>

      <div className="flex flex-col gap-1">
        <MemberName name={profile.full_name} badge={profile.badge} />
        <div className="text-xs text-muted-foreground">
          {[profile.batch_name, profile.house_name, profile.network_name]
            .filter(Boolean)
            .join(' · ') || '—'}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)_280px]">
        {/* ─── Left rail: Personal Info ─── */}
        <aside className="flex flex-col gap-4">
          <Section title="Contact">
            <InfoRow Icon={Mail} value={profile.email ?? '—'} />
            <InfoRow Icon={Phone} value={profile.phone ?? '—'} />
            <InfoRow Icon={MapPin} value={location || '—'} />
          </Section>

          <Section title="Personal">
            <KeyValue k="Entry year" v={profile.entry_year?.toString() ?? '—'} />
            <KeyValue k="Exit year" v={profile.exit_year?.toString() ?? '—'} />
            <KeyValue k="Field" v={profile.field ?? '—'} />
            <KeyValue k="Status" v={profile.member_status} />
          </Section>

          <Section title="Membership">
            <KeyValue k="Batch" v={profile.batch_name ?? '—'} />
            <KeyValue k="House" v={profile.house_name ?? '—'} />
            <KeyValue k="Network" v={profile.network_name ?? '—'} />
            <KeyValue k="Currently at" v={currentAffiliation?.scope_name ?? '—'} />
          </Section>
        </aside>

        {/* ─── Center: tabs ─── */}
        <div className="flex min-w-0 flex-col gap-3">
          <Tabs value={tab} onValueChange={(v) => setTab(v as 'overview' | 'admin')}>
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
                  <RegistrationCard row={currentAffiliation} />
                ) : (
                  <EmptyCard label="No active membership." />
                )}
              </div>

              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Membership history
                </h3>
                {history.length === 0 ? (
                  <EmptyCard label="No membership history yet." />
                ) : (
                  <ul className="flex flex-col gap-2">
                    {history.map((h) => (
                      <li
                        key={h.id}
                        className="flex flex-col gap-1 rounded-xl border border-border bg-card p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-sm font-medium text-foreground">
                            {h.scope_name}{' '}
                            <span className="text-xs text-muted-foreground">· {h.scope_type}</span>
                          </div>
                          <StatusBadge status={h.status} />
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span>
                            Joined: {h.joined_at ? new Date(h.joined_at).toLocaleDateString() : '—'}
                          </span>
                          {h.left_at && (
                            <span>Left: {new Date(h.left_at).toLocaleDateString()}</span>
                          )}
                          {h.transferred_at && (
                            <span>
                              Transferred: {new Date(h.transferred_at).toLocaleDateString()}
                            </span>
                          )}
                          <span>via {h.join_method}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </TabsContent>

            <TabsContent value="admin" className="flex flex-col gap-2">
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Audit log slice for this member lands with the audit-viewer epic. The Server
                Component reads audit.audit_events joined to the target member id.
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* ─── Right rail: Admin Options + Engagement ─── */}
        <aside className="flex flex-col gap-4">
          <Section title="Admin options">
            <AdminAction
              label="Set engagement"
              Icon={Check}
              onClick={() => stub('Set engagement')}
            />
            <AdminAction
              label="Mark registration paid"
              Icon={Check}
              onClick={() => stub('Mark registration paid')}
            />
            <AdminAction
              label="Waive registration"
              Icon={Ban}
              onClick={() => stub('Waive registration')}
            />
            <AdminAction
              label="Pay on behalf"
              Icon={HandCoins}
              onClick={() => stub('Pay on behalf')}
            />
            <AdminAction
              label="Initiate transfer"
              Icon={ArrowLeftRight}
              onClick={() => stub('Initiate transfer')}
            />
            <AdminAction
              label="Remove from scope"
              Icon={UserMinus}
              onClick={() => stub('Remove from scope')}
              destructive
            />
          </Section>

          <Section title="Engagement">
            {currentAffiliation ? (
              <div className="flex flex-col gap-1 text-sm">
                <div className="text-muted-foreground">Current tier</div>
                <EngagementBadge tier={currentAffiliation.engagement} />
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                No active membership to show engagement for.
              </div>
            )}
          </Section>

          <Section title="Household">
            <div className="text-xs text-muted-foreground">
              Household surface lands with the households epic.
            </div>
          </Section>
        </aside>
      </div>
    </div>
  );
}

// ─── Left/right rail primitives ────────────────────────────────────

function Section({
  title,
  children,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function InfoRow({ Icon, value }: { readonly Icon: typeof Mail; readonly value: string }) {
  return (
    <div className="flex items-start gap-2 text-sm text-foreground">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="truncate">{value}</span>
    </div>
  );
}

function KeyValue({ k, v }: { readonly k: string; readonly v: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-xs text-muted-foreground">{k}</div>
      <div className="text-sm text-foreground">{v}</div>
    </div>
  );
}

function AdminAction({
  label,
  Icon,
  onClick,
  destructive,
}: {
  readonly label: string;
  readonly Icon: typeof Check;
  readonly onClick: () => void;
  readonly destructive?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={
        destructive ? 'justify-start text-destructive hover:text-destructive' : 'justify-start'
      }
      onClick={onClick}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Button>
  );
}

// ─── Central tab helpers ───────────────────────────────────────────

function EmptyCard({ label }: { readonly label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

function RegistrationCard({ row }: { readonly row: MembershipHistoryRow }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-sm font-medium text-foreground">{row.scope_name}</div>
        <RegistrationBadge state={row.registration_state} />
      </div>
      {row.registration_note && (
        <div className="text-xs italic text-muted-foreground">
          &ldquo;{row.registration_note}&rdquo;
        </div>
      )}
    </div>
  );
}

// ─── Badges ────────────────────────────────────────────────────────

function StatusBadge({ status }: { readonly status: string }) {
  const styles: Record<string, string> = {
    active: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    passive: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
    pending: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300',
    transferred: 'border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300',
    left: 'border-muted-foreground/30 bg-muted/40 text-muted-foreground',
    rejected: 'border-destructive/40 bg-destructive/10 text-destructive',
  };
  return (
    <Badge variant="outline" className={styles[status] ?? 'border-border text-foreground'}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function EngagementBadge({ tier }: { readonly tier: string }) {
  const styles: Record<string, string> = {
    dormant: 'border-muted-foreground/30 bg-muted/40 text-muted-foreground',
    normal: 'border-border bg-background text-foreground',
    engaged: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300',
    committed: 'border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300',
  };
  return (
    <Badge variant="outline" className={`w-fit ${styles[tier] ?? 'border-border text-foreground'}`}>
      {tier.charAt(0).toUpperCase() + tier.slice(1)}
    </Badge>
  );
}

function RegistrationBadge({ state }: { readonly state: string }) {
  const styles: Record<string, string> = {
    not_required: 'border-muted-foreground/30 bg-muted/40 text-muted-foreground',
    pending: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
    paid: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    paid_on_behalf:
      'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    waived: 'border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300',
  };
  const labels: Record<string, string> = {
    not_required: 'Not required',
    pending: 'Pending',
    paid: 'Paid',
    paid_on_behalf: 'Paid on behalf',
    waived: 'Waived',
  };
  return (
    <Badge variant="outline" className={styles[state] ?? 'border-border text-foreground'}>
      {labels[state] ?? state}
    </Badge>
  );
}

function stub(label: string) {
  // Placeholder — real wiring in a follow-up. The plan's per-action
  // permission gates + dialogs will fill this in one at a time.
  import('@shesa/ui').then(({ toast }) => toast.warning(`${label} — coming soon.`));
}
