'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Archive,
  CalendarPlus,
  CircleCheck,
  CircleDollarSign,
  HandHeart,
  Plus,
  Square,
  Undo2,
} from 'lucide-react';

import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EntityTablePanel,
  Input,
  Label,
  NativeDateInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  toast,
  type ColDef,
  type GridApi,
  type ICellRendererParams,
} from '@shesa/ui';

import {
  approveCampaign,
  archiveCampaign,
  closeCampaign,
  createCampaign,
  extendCampaign,
  recordWalkInDonation,
  reverseDonation,
  type PaymentMethod,
} from '../actions';

export interface CampaignRow {
  readonly id: string;
  readonly scopeId: string;
  readonly scopeName: string;
  readonly currency: string;
  readonly name: string;
  readonly description: string | null;
  readonly lifecycle: string | null;
  readonly openDate: string | null;
  readonly closeDate: string | null;
  readonly status: string;
  readonly raised: number;
  readonly donationCount: number;
}

export interface DonationRow {
  readonly id: string;
  readonly campaignName: string;
  readonly scopeName: string;
  readonly donorLabel: string;
  readonly isMember: boolean;
  readonly isPublic: boolean;
  readonly amount: number;
  readonly currency: string;
  readonly method: string;
  readonly reversesPaymentId: string | null;
  readonly isReversed: boolean;
  readonly createdAt: string;
}

export interface ScopeOption {
  readonly id: string;
  readonly name: string;
  readonly currency: string;
}

type SerialCampaignRow = CampaignRow & { readonly serial: number };
type SerialDonationRow = DonationRow & { readonly serial: number };

const PAYMENT_METHODS: readonly { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'mtn_momo', label: 'MTN MoMo' },
  { value: 'orange_money', label: 'Orange Money' },
  { value: 'bank_transfer', label: 'Bank transfer' },
];

interface NewCampaignForm {
  scopeId: string;
  name: string;
  description: string;
  openDate: string;
  closeDate: string;
}

interface WalkInForm {
  campaignId: string;
  amount: string;
  method: PaymentMethod;
  donorName: string;
  donorEmail: string;
  memo: string;
}

const initialNewCampaign = (scopeOptions: readonly ScopeOption[]): NewCampaignForm => ({
  scopeId: scopeOptions[0]?.id ?? '',
  name: '',
  description: '',
  openDate: new Date().toISOString().slice(0, 10),
  closeDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10),
});

const initialWalkIn = (activeCampaigns: readonly CampaignRow[]): WalkInForm => ({
  campaignId: activeCampaigns[0]?.id ?? '',
  amount: '',
  method: 'cash',
  donorName: '',
  donorEmail: '',
  memo: '',
});

interface DonationsViewProps {
  readonly campaigns: readonly CampaignRow[];
  readonly donations: readonly DonationRow[];
  readonly scopeOptions: readonly ScopeOption[];
}

export function DonationsView({ campaigns, donations, scopeOptions }: DonationsViewProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Campaign state
  const [campaignSearch, setCampaignSearch] = useState('');
  const [campaignLifecycleFilter, setCampaignLifecycleFilter] = useState<
    'all' | 'draft' | 'open' | 'closed' | 'archived'
  >('all');
  const [campaignGridApi, setCampaignGridApi] = useState<GridApi<SerialCampaignRow> | null>(null);
  const [newCampaignOpen, setNewCampaignOpen] = useState(false);
  const [newCampaignForm, setNewCampaignForm] = useState<NewCampaignForm>(() =>
    initialNewCampaign(scopeOptions),
  );
  const [extendTarget, setExtendTarget] = useState<CampaignRow | null>(null);
  const [extendDate, setExtendDate] = useState('');
  const [extendReason, setExtendReason] = useState('');
  const [closingId, setClosingId] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  // Donation state
  const [donationSearch, setDonationSearch] = useState('');
  const [donorFilter, setDonorFilter] = useState<'all' | 'member' | 'public' | 'walkin'>('all');
  const [donationGridApi, setDonationGridApi] = useState<GridApi<SerialDonationRow> | null>(null);
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [walkInForm, setWalkInForm] = useState<WalkInForm>(() =>
    initialWalkIn(campaigns.filter((c) => c.lifecycle === 'open')),
  );
  const [reversing, setReversing] = useState<DonationRow | null>(null);
  const [reverseReason, setReverseReason] = useState('');

  const activeCampaigns = useMemo(
    () => campaigns.filter((c) => c.lifecycle === 'open'),
    [campaigns],
  );
  const canCreateCampaign = scopeOptions.length > 0;
  const canWalkIn = activeCampaigns.length > 0;

  const filteredCampaigns = useMemo<readonly SerialCampaignRow[]>(() => {
    const q = campaignSearch.trim().toLowerCase();
    return campaigns
      .filter((c) => {
        if (campaignLifecycleFilter !== 'all' && c.lifecycle !== campaignLifecycleFilter)
          return false;
        if (!q) return true;
        if (c.name.toLowerCase().includes(q)) return true;
        if (c.scopeName.toLowerCase().includes(q)) return true;
        if (c.description?.toLowerCase().includes(q)) return true;
        return false;
      })
      .map((c, i) => ({ ...c, serial: i + 1 }));
  }, [campaigns, campaignSearch, campaignLifecycleFilter]);

  const filteredDonations = useMemo<readonly SerialDonationRow[]>(() => {
    const q = donationSearch.trim().toLowerCase();
    return donations
      .filter((d) => {
        if (donorFilter === 'member' && !d.isMember) return false;
        if (donorFilter === 'public' && !d.isPublic) return false;
        if (donorFilter === 'walkin' && (d.isMember || d.isPublic)) return false;
        if (!q) return true;
        if (d.campaignName.toLowerCase().includes(q)) return true;
        if (d.donorLabel.toLowerCase().includes(q)) return true;
        if (d.scopeName.toLowerCase().includes(q)) return true;
        return false;
      })
      .map((d, i) => ({ ...d, serial: i + 1 }));
  }, [donations, donationSearch, donorFilter]);

  const resetNewCampaign = () => setNewCampaignForm(initialNewCampaign(scopeOptions));
  const resetWalkIn = () => setWalkInForm(initialWalkIn(activeCampaigns));

  const runCreateCampaign = () => {
    if (!newCampaignForm.scopeId) {
      toast.error('Pick a scope.');
      return;
    }
    if (!newCampaignForm.name.trim()) {
      toast.error('Name is required.');
      return;
    }
    const scope = scopeOptions.find((s) => s.id === newCampaignForm.scopeId);
    if (!scope) {
      toast.error('Invalid scope.');
      return;
    }
    const openDate = new Date(newCampaignForm.openDate);
    const closeDate = new Date(newCampaignForm.closeDate);
    if (closeDate.getTime() <= openDate.getTime()) {
      toast.error('Close date must be after open date.');
      return;
    }

    startTransition(async () => {
      const result = await createCampaign({
        scopeId: scope.id,
        name: newCampaignForm.name.trim(),
        description: newCampaignForm.description.trim() || null,
        currency: scope.currency,
        openDate: openDate.toISOString(),
        closeDate: closeDate.toISOString(),
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Campaign created as draft. Approve to open donations.');
      setNewCampaignOpen(false);
      resetNewCampaign();
      router.refresh();
    });
  };

  const runApproveCampaign = (id: string) => {
    startTransition(async () => {
      const result = await approveCampaign(id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Campaign is open — accepting donations.');
      router.refresh();
    });
  };

  const runCloseCampaign = () => {
    if (!closingId) return;
    const id = closingId;
    setClosingId(null);
    startTransition(async () => {
      const result = await closeCampaign(id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Campaign closed.');
      router.refresh();
    });
  };

  const runExtendCampaign = () => {
    if (!extendTarget) return;
    if (!extendDate) {
      toast.error('Pick a new close date.');
      return;
    }
    const newClose = new Date(extendDate);
    if (
      extendTarget.closeDate &&
      newClose.getTime() <= new Date(extendTarget.closeDate).getTime()
    ) {
      toast.error('New close date must be after the current one.');
      return;
    }
    const id = extendTarget.id;
    const iso = newClose.toISOString();
    const reason = extendReason.trim() || undefined;
    setExtendTarget(null);
    setExtendDate('');
    setExtendReason('');
    startTransition(async () => {
      const result = await extendCampaign(id, iso, reason);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Campaign extended.');
      router.refresh();
    });
  };

  const runArchiveCampaign = () => {
    if (!archivingId) return;
    const id = archivingId;
    setArchivingId(null);
    startTransition(async () => {
      const result = await archiveCampaign(id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Campaign archived.');
      router.refresh();
    });
  };

  const runWalkIn = () => {
    if (!walkInForm.campaignId) {
      toast.error('Pick a campaign.');
      return;
    }
    const campaign = activeCampaigns.find((c) => c.id === walkInForm.campaignId);
    if (!campaign) {
      toast.error('Campaign not open for donations.');
      return;
    }
    const amount = parseFloat(walkInForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter a positive amount.');
      return;
    }
    startTransition(async () => {
      const result = await recordWalkInDonation({
        chargeId: campaign.id,
        amount,
        currency: campaign.currency,
        method: walkInForm.method,
        donorName: walkInForm.donorName.trim() || undefined,
        donorEmail: walkInForm.donorEmail.trim() || undefined,
        memo: walkInForm.memo.trim() || undefined,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Donation recorded.');
      setWalkInOpen(false);
      resetWalkIn();
      router.refresh();
    });
  };

  const runReverse = () => {
    if (!reversing) return;
    if (!reverseReason.trim()) {
      toast.error('Reason is required.');
      return;
    }
    const id = reversing.id;
    const reason = reverseReason.trim();
    setReversing(null);
    setReverseReason('');
    startTransition(async () => {
      const result = await reverseDonation(id, reason);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Donation reversed.');
      router.refresh();
    });
  };

  const campaignColumns = useMemo<ColDef<SerialCampaignRow>[]>(
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
        headerName: 'Campaign',
        field: 'name',
        flex: 2,
        minWidth: 200,
        cellRenderer: (p: ICellRendererParams<SerialCampaignRow, string>) =>
          p.data ? (
            <div className="flex flex-col leading-tight">
              <span className="font-medium text-foreground">{p.data.name}</span>
              <span className="text-xs text-muted-foreground">{p.data.scopeName}</span>
            </div>
          ) : null,
      },
      {
        headerName: 'Raised',
        field: 'raised',
        flex: 1,
        minWidth: 160,
        cellRenderer: (p: ICellRendererParams<SerialCampaignRow, number>) =>
          p.data ? (
            <span className="font-mono text-sm text-foreground">
              {new Intl.NumberFormat().format(Math.round(p.data.raised))} {p.data.currency}
            </span>
          ) : null,
      },
      {
        headerName: 'Donations',
        field: 'donationCount',
        width: 120,
        valueFormatter: (p) => (p.value != null ? String(p.value) : '0'),
      },
      {
        headerName: 'Closes',
        field: 'closeDate',
        width: 140,
        valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleDateString() : '—'),
      },
      {
        headerName: 'Lifecycle',
        field: 'lifecycle',
        width: 130,
        cellRenderer: (p: ICellRendererParams<SerialCampaignRow, string>) => (
          <LifecycleBadge value={p.value ?? null} />
        ),
      },
      {
        headerName: 'Actions',
        colId: 'row_actions',
        width: 250,
        sortable: false,
        filter: false,
        suppressMovable: true,
        cellRenderer: (p: ICellRendererParams<SerialCampaignRow>) => {
          if (!p.data) return null;
          const row = p.data;
          return (
            <div className="flex items-center gap-1">
              {row.lifecycle === 'draft' && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    runApproveCampaign(row.id);
                  }}
                  disabled={pending}
                  title="Approve → open"
                >
                  <CircleCheck className="h-3.5 w-3.5" />
                </Button>
              )}
              {row.lifecycle === 'open' && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setClosingId(row.id);
                  }}
                  disabled={pending}
                  title="Close"
                >
                  <Square className="h-3.5 w-3.5" />
                </Button>
              )}
              {(row.lifecycle === 'open' || row.lifecycle === 'closed') && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExtendTarget(row);
                    setExtendDate(
                      row.closeDate
                        ? new Date(new Date(row.closeDate).getTime() + 30 * 24 * 3600 * 1000)
                            .toISOString()
                            .slice(0, 10)
                        : '',
                    );
                    setExtendReason('');
                  }}
                  disabled={pending}
                  title="Extend"
                >
                  <CalendarPlus className="h-3.5 w-3.5" />
                </Button>
              )}
              {row.lifecycle !== 'archived' && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setArchivingId(row.id);
                  }}
                  disabled={pending}
                  title="Archive"
                >
                  <Archive className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [pending],
  );

  const donationColumns = useMemo<ColDef<SerialDonationRow>[]>(
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
        headerName: 'When',
        field: 'createdAt',
        width: 170,
        valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleString() : '—'),
      },
      {
        headerName: 'Donor',
        field: 'donorLabel',
        flex: 1.5,
        minWidth: 180,
        cellRenderer: (p: ICellRendererParams<SerialDonationRow, string>) => {
          if (!p.data) return null;
          const row = p.data;
          return (
            <div className="flex flex-col leading-tight">
              <span className="text-foreground">{row.donorLabel}</span>
              <span className="text-xs text-muted-foreground">
                {row.isMember ? 'Member' : row.isPublic ? 'Public site' : 'Walk-in'}
              </span>
            </div>
          );
        },
      },
      { headerName: 'Campaign', field: 'campaignName', flex: 1.5, minWidth: 180 },
      {
        headerName: 'Amount',
        field: 'amount',
        width: 150,
        cellRenderer: (p: ICellRendererParams<SerialDonationRow, number>) =>
          p.data ? (
            <span
              className={`font-mono text-sm ${
                p.data.reversesPaymentId ? 'text-amber-700 dark:text-amber-400' : 'text-foreground'
              }`}
            >
              {new Intl.NumberFormat().format(p.data.amount)} {p.data.currency}
            </span>
          ) : null,
      },
      {
        headerName: 'Method',
        field: 'method',
        width: 130,
        valueFormatter: (p) => formatMethod(p.value ?? ''),
      },
      {
        headerName: 'Status',
        field: 'reversesPaymentId',
        width: 140,
        cellRenderer: (p: ICellRendererParams<SerialDonationRow>) => {
          if (!p.data) return null;
          if (p.data.reversesPaymentId) {
            return (
              <Badge
                variant="outline"
                className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
              >
                Reversal
              </Badge>
            );
          }
          if (p.data.isReversed) {
            return (
              <Badge
                variant="outline"
                className="border-destructive/40 bg-destructive/10 text-destructive"
              >
                Reversed
              </Badge>
            );
          }
          return (
            <Badge
              variant="outline"
              className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
            >
              Cleared
            </Badge>
          );
        },
      },
      {
        headerName: 'Actions',
        colId: 'row_actions',
        width: 130,
        sortable: false,
        filter: false,
        suppressMovable: true,
        cellRenderer: (p: ICellRendererParams<SerialDonationRow>) => {
          if (!p.data) return null;
          const row = p.data;
          if (row.reversesPaymentId || row.isReversed) return null;
          return (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                setReversing(row);
              }}
              disabled={pending}
              title="Reverse donation"
            >
              <Undo2 className="h-3.5 w-3.5" />
              Reverse
            </Button>
          );
        },
      },
    ],
    [pending],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-8">
      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Finance
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <CircleDollarSign className="h-6 w-6" />
          Donations
        </h1>
        <p className="text-sm text-muted-foreground">
          Freewill gifts. Public entries come from the website; walk-ins are recorded here by
          Finance. Each donation gets an auto-generated receipt token.
        </p>
      </div>

      {/* Campaigns section */}
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Campaigns
          </h2>
        </div>
        <EntityTablePanel
          count={filteredCampaigns.length}
          countLabel={filteredCampaigns.length === 1 ? 'campaign' : 'campaigns'}
          search={campaignSearch}
          onSearchChange={setCampaignSearch}
          gridApi={campaignGridApi}
          canCreate={canCreateCampaign}
          createLabel="New campaign"
          onCreate={() => {
            resetNewCampaign();
            setNewCampaignOpen(true);
          }}
          filters={
            <Select
              value={campaignLifecycleFilter}
              onValueChange={(v) => setCampaignLifecycleFilter(v as typeof campaignLifecycleFilter)}
            >
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All lifecycles</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          }
        />
        <DataTable<SerialCampaignRow>
          rowData={filteredCampaigns as SerialCampaignRow[]}
          columnDefs={campaignColumns}
          getRowId={(p) => p.data.id}
          onGridReady={(e) => setCampaignGridApi(e.api)}
          showColumnPicker={false}
          selectable={false}
        />
      </section>

      {/* Donations feed */}
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Recent donations
          </h2>
        </div>
        <EntityTablePanel
          count={filteredDonations.length}
          countLabel={filteredDonations.length === 1 ? 'donation' : 'donations'}
          search={donationSearch}
          onSearchChange={setDonationSearch}
          gridApi={donationGridApi}
          canCreate={canWalkIn}
          createLabel="Record walk-in"
          onCreate={() => {
            resetWalkIn();
            setWalkInOpen(true);
          }}
          filters={
            <Select
              value={donorFilter}
              onValueChange={(v) => setDonorFilter(v as typeof donorFilter)}
            >
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All donors</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="public">Public site</SelectItem>
                <SelectItem value="walkin">Walk-ins</SelectItem>
              </SelectContent>
            </Select>
          }
        />
        <DataTable<SerialDonationRow>
          rowData={filteredDonations as SerialDonationRow[]}
          columnDefs={donationColumns}
          getRowId={(p) => p.data.id}
          onGridReady={(e) => setDonationGridApi(e.api)}
          showColumnPicker={false}
          selectable={false}
        />
      </section>

      {/* New campaign dialog */}
      <Dialog open={newCampaignOpen} onOpenChange={setNewCampaignOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New donation campaign</DialogTitle>
            <DialogDescription>
              Enters as draft. Approve to open it for donations from the website + walk-ins.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-scope">Scope</Label>
              <Select
                value={newCampaignForm.scopeId}
                onValueChange={(v) => setNewCampaignForm((f) => ({ ...f, scopeId: v }))}
              >
                <SelectTrigger id="new-scope">
                  <SelectValue placeholder="Pick a scope" />
                </SelectTrigger>
                <SelectContent>
                  {scopeOptions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} · {s.currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-name">Name</Label>
              <Input
                id="new-name"
                value={newCampaignForm.name}
                onChange={(e) => setNewCampaignForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Shesa Buea General Fund"
                maxLength={200}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-description">Description (optional)</Label>
              <Textarea
                id="new-description"
                rows={2}
                value={newCampaignForm.description}
                onChange={(e) => setNewCampaignForm((f) => ({ ...f, description: e.target.value }))}
                maxLength={2000}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-open">Open date</Label>
                <NativeDateInput
                  id="new-open"
                  value={newCampaignForm.openDate}
                  onChange={(v) => setNewCampaignForm((f) => ({ ...f, openDate: v }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-close">Close date</Label>
                <NativeDateInput
                  id="new-close"
                  value={newCampaignForm.closeDate}
                  onChange={(v) => setNewCampaignForm((f) => ({ ...f, closeDate: v }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setNewCampaignOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={runCreateCampaign} disabled={pending}>
              <Plus className="h-4 w-4" />
              Create draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend dialog */}
      <Dialog open={!!extendTarget} onOpenChange={(o) => !o && setExtendTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Extend campaign</DialogTitle>
            <DialogDescription>
              Sets a new close date past the current one. Audited into contribution_extensions.
            </DialogDescription>
          </DialogHeader>
          {extendTarget && (
            <div className="flex flex-col gap-3">
              <div className="rounded-md border border-border bg-muted/30 p-3 text-xs">
                <div className="text-foreground">{extendTarget.name}</div>
                <div className="text-muted-foreground">
                  Current close:{' '}
                  {extendTarget.closeDate ? new Date(extendTarget.closeDate).toLocaleString() : '—'}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="extend-date">New close date</Label>
                <NativeDateInput
                  id="extend-date"
                  value={extendDate}
                  onChange={(v) => setExtendDate(v)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="extend-reason">Reason (optional)</Label>
                <Textarea
                  id="extend-reason"
                  rows={2}
                  value={extendReason}
                  onChange={(e) => setExtendReason(e.target.value)}
                  maxLength={500}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setExtendTarget(null)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={runExtendCampaign} disabled={pending}>
              Extend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Walk-in donation dialog */}
      <Dialog open={walkInOpen} onOpenChange={setWalkInOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record a walk-in donation</DialogTitle>
            <DialogDescription>
              For gifts that came directly to Finance (not through the website). Donor name lands on
              the receipt and reports; leave blank for anonymous.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wi-campaign">Campaign</Label>
              <Select
                value={walkInForm.campaignId}
                onValueChange={(v) => setWalkInForm((f) => ({ ...f, campaignId: v }))}
              >
                <SelectTrigger id="wi-campaign">
                  <SelectValue placeholder="Pick a campaign" />
                </SelectTrigger>
                <SelectContent>
                  {activeCampaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} · {c.scopeName} · {c.currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="wi-amount">Amount</Label>
                <Input
                  id="wi-amount"
                  type="number"
                  min="0"
                  step="1"
                  value={walkInForm.amount}
                  onChange={(e) => setWalkInForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="5000"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="wi-method">Method</Label>
                <Select
                  value={walkInForm.method}
                  onValueChange={(v) =>
                    setWalkInForm((f) => ({ ...f, method: v as PaymentMethod }))
                  }
                >
                  <SelectTrigger id="wi-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wi-donor">Donor name (optional)</Label>
              <Input
                id="wi-donor"
                value={walkInForm.donorName}
                onChange={(e) => setWalkInForm((f) => ({ ...f, donorName: e.target.value }))}
                placeholder="Leave blank for anonymous"
                maxLength={200}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wi-email">Donor email (optional)</Label>
              <Input
                id="wi-email"
                type="email"
                value={walkInForm.donorEmail}
                onChange={(e) => setWalkInForm((f) => ({ ...f, donorEmail: e.target.value }))}
                placeholder="For a receipt email"
                maxLength={320}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wi-memo">Memo (optional)</Label>
              <Input
                id="wi-memo"
                value={walkInForm.memo}
                onChange={(e) => setWalkInForm((f) => ({ ...f, memo: e.target.value }))}
                placeholder="Note for the receipt / audit"
                maxLength={500}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setWalkInOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={runWalkIn} disabled={pending}>
              <HandHeart className="h-4 w-4" />
              Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reverse donation dialog */}
      <Dialog open={!!reversing} onOpenChange={(o) => !o && setReversing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reverse this donation?</DialogTitle>
            <DialogDescription>
              Payments are append-only. Reversal inserts a new row that cancels the original in the
              ledger + treasury balance. Reason is required.
            </DialogDescription>
          </DialogHeader>
          {reversing && (
            <div className="flex flex-col gap-3">
              <div className="rounded-md border border-border bg-muted/30 p-3 text-xs">
                <div className="font-mono text-sm text-foreground">
                  {new Intl.NumberFormat().format(reversing.amount)} {reversing.currency}
                </div>
                <div className="text-muted-foreground">
                  {reversing.donorLabel} · {reversing.campaignName}
                </div>
                <div className="text-muted-foreground">
                  {new Date(reversing.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rv-reason">Reason</Label>
                <Textarea
                  id="rv-reason"
                  rows={3}
                  value={reverseReason}
                  onChange={(e) => setReverseReason(e.target.value)}
                  placeholder="e.g. Donor asked us to refund"
                  maxLength={500}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReversing(null)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={runReverse}
              disabled={pending}
            >
              <Undo2 className="h-4 w-4" />
              Reverse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!closingId}
        title="Close this campaign?"
        description="Stops accepting donations immediately."
        confirmLabel="Close"
        onConfirm={runCloseCampaign}
        onCancel={() => setClosingId(null)}
      />

      <ConfirmDialog
        open={!!archivingId}
        title="Archive this campaign?"
        description="Existing donations stay in the ledger. Archive just hides the campaign from live lists."
        confirmLabel="Archive"
        onConfirm={runArchiveCampaign}
        onCancel={() => setArchivingId(null)}
      />
    </div>
  );
}

function LifecycleBadge({ value }: { readonly value: string | null }) {
  const styles: Record<string, string> = {
    draft: 'border-muted-foreground/30 bg-muted/40 text-muted-foreground',
    open: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    closed: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
    archived: 'border-destructive/40 bg-destructive/10 text-destructive',
  };
  const label = value ? value.charAt(0).toUpperCase() + value.slice(1) : '—';
  return (
    <Badge variant="outline" className={value ? styles[value] : 'border-border text-foreground'}>
      {label}
    </Badge>
  );
}

function formatMethod(method: string): string {
  switch (method) {
    case 'cash':
      return 'Cash';
    case 'mtn_momo':
      return 'MTN MoMo';
    case 'orange_money':
      return 'Orange Money';
    case 'bank_transfer':
      return 'Bank transfer';
    case 'card':
      return 'Card';
    default:
      return method;
  }
}
