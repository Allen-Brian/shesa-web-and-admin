'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';

import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shesa/ui';

import { AgmStatusBadge } from './status-badge';
import { AgmTicketRowActions } from './row-actions';
import type { AgmTicketRow, AgmTicketStatus } from './types';

interface Props {
  readonly tickets: readonly AgmTicketRow[];
  /** When true (Finance persona), row menu includes "Mark as paid". */
  readonly canReconcile: boolean;
}

const PAYMENT_LABEL: Record<string, string> = {
  'mtn-momo': 'MTN MoMo',
  'orange-money': 'Orange Money',
  card: 'Card',
  'bank-transfer': 'Bank transfer',
  'cash-on-site': 'Cash on arrival',
};

/**
 * Simple filterable list. We deliberately don't reach for the shared
 * ag-grid `DataTable` here — the AGM ticket list is temporary and
 * doesn't need column-picker / selection / mass-actions. A plain
 * table gives us the row layout we want (printable-ish) with far
 * less machinery.
 */
export function AgmTicketsTable({ tickets, canReconcile }: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AgmTicketStatus>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (!q) return true;
      return (
        t.code.toLowerCase().includes(q) ||
        t.fullName.toLowerCase().includes(q) ||
        !!t.email?.toLowerCase().includes(q) ||
        !!t.phone?.toLowerCase().includes(q)
      );
    });
  }, [tickets, search, statusFilter]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, code, email…"
            className="h-9 pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as 'all' | AgmTicketStatus)}
        >
          <SelectTrigger className="h-9 w-40 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="issued">Issued</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <p className="ml-auto text-xs text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? 'ticket' : 'tickets'}
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-muted/40 text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Attendee</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Payment</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Registered</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No tickets match this filter.
                </td>
              </tr>
            ) : (
              filtered.map((t) => (
                <tr key={t.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <Link
                      href={`/agm-2026/receipt/${t.code}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[12px] font-semibold tracking-[0.1em] text-primary hover:underline"
                    >
                      {t.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">{t.fullName}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    <div className="flex flex-col gap-0.5">
                      {t.email && <span>{t.email}</span>}
                      {t.phone && <span>{t.phone}</span>}
                      {!t.email && !t.phone && <span>—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-foreground">
                    {t.amountXaf.toLocaleString()}{' '}
                    <span className="text-xs text-muted-foreground">XAF</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {PAYMENT_LABEL[t.paymentOption] ?? t.paymentOption}
                  </td>
                  <td className="px-4 py-3">
                    <AgmStatusBadge status={t.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(t.createdAt).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <AgmTicketRowActions ticket={t} canReconcile={canReconcile} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
