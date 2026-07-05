'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftRight,
  ArrowLeft,
  Ban,
  Check,
  ChevronDown,
  HandCoins,
  Mail,
  MapPin,
  Phone,
  Star,
  UserMinus,
} from 'lucide-react';

import {
  Badge,
  Button,
  ConfirmDialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  toast,
} from '@shesa/ui';

import type { ExcoBadgeInfo } from '@/components/governance/exco-badge';
import { MemberName } from '@/components/governance/member-name';
import { ENGAGEMENT_TIERS, type EngagementTier } from '@shesa/domain/memberships';

import {
  markRegistrationPaid,
  payRegistrationOnBehalf,
  removeMembership,
  requestTransfer,
  setEngagement,
  waiveRegistration,
} from '../../../../actions';

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
  readonly engagement: 'dormant' | 'normal' | 'engaged' | 'committed' | 'pillar';
  readonly join_method: string;
  readonly joined_at: string | null;
  readonly approved_at: string | null;
  readonly left_at: string | null;
  readonly transferred_at: string | null;
  readonly registration_state: 'not_required' | 'pending' | 'paid' | 'paid_on_behalf' | 'waived';
  readonly registration_note: string | null;
  readonly is_active: boolean;
}

export interface TransferDestination {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly scope_type: 'branch' | 'chapter';
}

export interface ProfilePermissions {
  readonly setEngagement: boolean;
  readonly markPaid: boolean;
  readonly waive: boolean;
  readonly payOnBehalf: boolean;
  readonly transfer: boolean;
  readonly remove: boolean;
}

interface Props {
  readonly viewerScopeSlug: string;
  readonly viewerScopeName: string;
  readonly viewerScopeId: string;
  readonly viewerMembershipId: string | null;
  readonly profile: MemberProfile;
  readonly history: readonly MembershipHistoryRow[];
  readonly transferDestinations: readonly TransferDestination[];
  readonly permissions: ProfilePermissions;
}

type DialogState =
  | null
  | { readonly kind: 'markPaid' }
  | { readonly kind: 'waive' }
  | { readonly kind: 'payOnBehalf' }
  | { readonly kind: 'transfer' }
  | { readonly kind: 'remove' };

/**
 * Member profile — three-column layout per the M6 spec, matching the
 * design inspiration:
 *   left rail   → sectioned personal info (Contact / Personal / Membership)
 *   center      → tabs (Overview / Admin Activities)
 *   right rail  → Admin Options + Engagement + Household
 *
 * Admin Options are per-action permission-gated. Each button hides on its
 * own key at the viewer's scope; rendering ≠ authorization (server
 * re-checks). Buttons that need a membership at the viewer's scope stay
 * disabled when the member has none here.
 */
export function MemberProfileView({
  viewerScopeSlug,
  viewerScopeName,
  viewerScopeId,
  viewerMembershipId,
  profile,
  history,
  transferDestinations,
  permissions,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<'overview' | 'admin'>('overview');
  const [dialog, setDialog] = useState<DialogState>(null);
  const [waiveReason, setWaiveReason] = useState('');
  const [onBehalfNote, setOnBehalfNote] = useState('');
  const [transferDestId, setTransferDestId] = useState<string>('');
  const [transferReason, setTransferReason] = useState('');
  const [pending, startTransition] = useTransition();

  const currentAffiliation = history.find((h) => h.is_active) ?? null;
  const viewerMembership = history.find((h) => h.scope_id === viewerScopeId) ?? null;
  const hasActiveHere =
    !!viewerMembership &&
    (viewerMembership.status === 'active' || viewerMembership.status === 'passive');

  const location = [profile.current_city, profile.current_region_state, profile.current_country]
    .filter(Boolean)
    .join(', ');

  const closeDialog = () => {
    setDialog(null);
    setWaiveReason('');
    setOnBehalfNote('');
    setTransferDestId('');
    setTransferReason('');
  };

  // ── Action runners ──────────────────────────────────────────────────
  const runSetEngagement = (tier: EngagementTier) => {
    if (!viewerMembershipId) return;
    startTransition(async () => {
      const result = await setEngagement({ membershipIds: [viewerMembershipId], tier });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(`Engagement set to ${tier}.`);
      router.refresh();
    });
  };

  const runMarkPaid = () => {
    if (!viewerMembershipId) return;
    closeDialog();
    startTransition(async () => {
      const result = await markRegistrationPaid(viewerMembershipId);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Registration marked paid.');
      router.refresh();
    });
  };

  const runWaive = () => {
    if (!viewerMembershipId) return;
    const reason = waiveReason;
    closeDialog();
    startTransition(async () => {
      const result = await waiveRegistration({ membershipId: viewerMembershipId, reason });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Registration waived.');
      router.refresh();
    });
  };

  const runPayOnBehalf = () => {
    if (!viewerMembershipId) return;
    const note = onBehalfNote;
    closeDialog();
    startTransition(async () => {
      const result = await payRegistrationOnBehalf({ membershipId: viewerMembershipId, note });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Registration recorded as paid on behalf.');
      router.refresh();
    });
  };

  const runTransfer = () => {
    if (!transferDestId) {
      toast.error('Pick a destination scope.');
      return;
    }
    const dest = transferDestId;
    const reason = transferReason.trim() || undefined;
    closeDialog();
    startTransition(async () => {
      const result = await requestTransfer({
        memberId: profile.id,
        sourceScopeId: viewerScopeId,
        destinationScopeId: dest,
        reason,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Transfer request created. Destination admin must approve.');
      router.refresh();
    });
  };

  const runRemove = () => {
    if (!viewerMembershipId) return;
    closeDialog();
    startTransition(async () => {
      const result = await removeMembership(viewerMembershipId);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(`${profile.full_name} removed from ${viewerScopeName}.`);
      router.push(`/exco/memberships/members/${viewerScopeSlug}`);
    });
  };

  // Buttons that operate on the viewer-scope membership need one to exist.
  const needsMembershipDisabled = !viewerMembershipId;
  const transferDisabled = !hasActiveHere || transferDestinations.length === 0;

  // Hide the entire Admin Options section if no button is visible.
  const anyPermission =
    permissions.setEngagement ||
    permissions.markPaid ||
    permissions.waive ||
    permissions.payOnBehalf ||
    permissions.transfer ||
    permissions.remove;

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
          {anyPermission ? (
            <Section title="Admin options">
              {!viewerMembership && (
                <p className="text-xs text-muted-foreground">
                  This member has no membership at {viewerScopeName}. Actions that need one are
                  disabled.
                </p>
              )}

              {permissions.setEngagement && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="justify-start"
                      disabled={pending || needsMembershipDisabled}
                    >
                      <Star className="h-4 w-4" />
                      Set engagement
                      <ChevronDown className="ml-auto h-3 w-3 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuLabel>Tier</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {ENGAGEMENT_TIERS.map((tier) => (
                      <DropdownMenuItem
                        key={tier}
                        onSelect={() => runSetEngagement(tier)}
                        disabled={pending}
                      >
                        {tier.charAt(0).toUpperCase() + tier.slice(1)}
                        {viewerMembership?.engagement === tier && (
                          <Check className="ml-auto h-3 w-3 opacity-60" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {permissions.markPaid && (
                <AdminAction
                  label="Mark registration paid"
                  Icon={Check}
                  disabled={pending || needsMembershipDisabled}
                  onClick={() => setDialog({ kind: 'markPaid' })}
                />
              )}

              {permissions.waive && (
                <AdminAction
                  label="Waive registration"
                  Icon={Ban}
                  disabled={pending || needsMembershipDisabled}
                  onClick={() => setDialog({ kind: 'waive' })}
                />
              )}

              {permissions.payOnBehalf && (
                <AdminAction
                  label="Pay on behalf"
                  Icon={HandCoins}
                  disabled={pending || needsMembershipDisabled}
                  onClick={() => setDialog({ kind: 'payOnBehalf' })}
                />
              )}

              {permissions.transfer && (
                <AdminAction
                  label="Initiate transfer"
                  Icon={ArrowLeftRight}
                  disabled={pending || transferDisabled}
                  onClick={() => setDialog({ kind: 'transfer' })}
                />
              )}

              {permissions.remove && (
                <AdminAction
                  label="Remove from scope"
                  Icon={UserMinus}
                  disabled={pending || needsMembershipDisabled}
                  onClick={() => setDialog({ kind: 'remove' })}
                  destructive
                />
              )}
            </Section>
          ) : null}

          <Section title="Engagement">
            {viewerMembership ? (
              <div className="flex flex-col gap-1 text-sm">
                <div className="text-muted-foreground">Current tier at {viewerScopeName}</div>
                <EngagementBadge tier={viewerMembership.engagement} />
              </div>
            ) : currentAffiliation ? (
              <div className="flex flex-col gap-1 text-sm">
                <div className="text-muted-foreground">
                  Elsewhere: {currentAffiliation.scope_name}
                </div>
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

      {/* ─── Dialogs ─── */}
      <ConfirmDialog
        open={dialog?.kind === 'markPaid'}
        title={`Mark ${profile.full_name}'s registration paid?`}
        description="Records marked_paid_at + marked_paid_by on the registration row. Audited."
        confirmLabel="Mark paid"
        onConfirm={runMarkPaid}
        onCancel={closeDialog}
      />

      <ReasonDialog
        open={dialog?.kind === 'waive'}
        title={`Waive ${profile.full_name}'s registration?`}
        description="Records waived_at + waived_by + a reason. Audited."
        value={waiveReason}
        onChange={setWaiveReason}
        placeholder="Reason for waiver (visible to admins)"
        confirmLabel="Waive"
        pending={pending}
        onConfirm={runWaive}
        onCancel={closeDialog}
      />

      <ReasonDialog
        open={dialog?.kind === 'payOnBehalf'}
        title={`Pay ${profile.full_name}'s registration on behalf?`}
        description="Records paid_on_behalf_at + paid_on_behalf_by + a note. The current user is recorded as the payer. Audited."
        value={onBehalfNote}
        onChange={setOnBehalfNote}
        placeholder="Note (e.g. payer name, method)"
        confirmLabel="Pay on behalf"
        pending={pending}
        onConfirm={runPayOnBehalf}
        onCancel={closeDialog}
      />

      <TransferDialog
        open={dialog?.kind === 'transfer'}
        memberName={profile.full_name}
        sourceName={viewerScopeName}
        destinations={transferDestinations}
        destinationId={transferDestId}
        onDestinationChange={setTransferDestId}
        reason={transferReason}
        onReasonChange={setTransferReason}
        pending={pending}
        onConfirm={runTransfer}
        onCancel={closeDialog}
      />

      <ConfirmDialog
        open={dialog?.kind === 'remove'}
        title={`Remove ${profile.full_name} from ${viewerScopeName}?`}
        description="Sets the membership_status to 'left' with left_at = now. Arrears (if any) stay with this body — the destination starts fresh if they rejoin later."
        confirmLabel="Remove"
        onConfirm={runRemove}
        onCancel={closeDialog}
      />
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
  disabled,
  destructive,
}: {
  readonly label: string;
  readonly Icon: typeof Check;
  readonly onClick: () => void;
  readonly disabled?: boolean;
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
      disabled={disabled}
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
    pillar: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
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

// ─── Dialogs ────────────────────────────────────────────────────────

function ReasonDialog({
  open,
  title,
  description,
  value,
  onChange,
  placeholder,
  confirmLabel,
  pending,
  onConfirm,
  onCancel,
}: {
  readonly open: boolean;
  readonly title: string;
  readonly description: string;
  readonly value: string;
  readonly onChange: (v: string) => void;
  readonly placeholder: string;
  readonly confirmLabel: string;
  readonly pending: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        <div className="mt-4 flex flex-col gap-2">
          <Label htmlFor="reason">Details</Label>
          {value.length > 40 ? (
            <Textarea
              id="reason"
              rows={3}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              maxLength={500}
            />
          ) : (
            <Input
              id="reason"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              maxLength={500}
            />
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={onConfirm} disabled={pending}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function TransferDialog({
  open,
  memberName,
  sourceName,
  destinations,
  destinationId,
  onDestinationChange,
  reason,
  onReasonChange,
  pending,
  onConfirm,
  onCancel,
}: {
  readonly open: boolean;
  readonly memberName: string;
  readonly sourceName: string;
  readonly destinations: readonly TransferDestination[];
  readonly destinationId: string;
  readonly onDestinationChange: (id: string) => void;
  readonly reason: string;
  readonly onReasonChange: (v: string) => void;
  readonly pending: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-foreground">
          Transfer {memberName} out of {sourceName}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Creates a pending transfer request. The destination admin must approve — the flip is
          intentional, per M1 lock.
        </p>
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dest">Destination</Label>
            <Select value={destinationId} onValueChange={onDestinationChange}>
              <SelectTrigger id="dest">
                <SelectValue placeholder="Pick a branch or autonomous chapter" />
              </SelectTrigger>
              <SelectContent>
                {destinations.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                    <span className="ml-2 text-xs text-muted-foreground">· {d.scope_type}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="transfer-reason">Reason (optional)</Label>
            <Textarea
              id="transfer-reason"
              rows={3}
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder="Context for the destination admin"
              maxLength={500}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={onConfirm} disabled={pending || !destinationId}>
            Request transfer
          </Button>
        </div>
      </div>
    </div>
  );
}
