import { formatPaymentMethod } from '@/lib/format/payment-method';
import type { ExportSpec } from '@/lib/export/workbook';

import type { SerialCampaignRow, SerialDonationRow } from './donations-types';

/**
 * Workbook shape for the Donations tab.
 *
 * The donor column carries whatever the table shows, and a separate
 * Visibility column says whether that name may be published — a sheet
 * that leaves the building must not lose the difference between a donor
 * who agreed to be named and one who did not.
 */
export function buildDonationsExport(
  rows: readonly SerialDonationRow[],
  meta: readonly { label: string; value: string }[],
): ExportSpec<SerialDonationRow> {
  return {
    filename: 'donations',
    title: 'Donations',
    subtitle: 'Freewill giving recorded against your campaigns',
    meta,
    sheetName: 'Donations',
    orientation: 'landscape',
    rows,
    columns: [
      { header: '#', value: (r) => r.serial, width: 6, align: 'center' },
      {
        header: 'Date',
        value: (r) => (r.createdAt ? new Date(r.createdAt) : null),
        width: 13,
        numFmt: 'dd mmm yyyy',
      },
      { header: 'Donor', value: (r) => r.donorLabel },
      { header: 'Email', value: (r) => r.donorEmail ?? '' },
      { header: 'Phone', value: (r) => r.donorPhone ?? '' },
      { header: 'Batch', value: (r) => r.donorBatch ?? '' },
      { header: 'Member code', value: (r) => r.donorMemberCode ?? '', width: 14 },
      { header: 'Donor type', value: (r) => (r.isMember ? 'Member' : 'Walk-in'), width: 12 },
      {
        header: 'Visibility',
        value: (r) => (r.isPublic ? 'May be named' : 'Anonymous'),
        width: 14,
      },
      { header: 'Campaign', value: (r) => r.campaignName },
      { header: 'Scope', value: (r) => r.scopeName },
      { header: 'Event group', value: (r) => r.groupName ?? '' },
      { header: 'Amount', value: (r) => r.amount, numFmt: '#,##0', align: 'right', total: true },
      { header: 'Currency', value: (r) => r.currency, width: 10, align: 'center' },
      { header: 'Method', value: (r) => formatPaymentMethod(r.method) },
      {
        header: 'State',
        value: (r) => (r.reversesPaymentId ? 'Reversal' : r.isReversed ? 'Reversed' : 'Cleared'),
        width: 11,
      },
    ],
  };
}

/**
 * Workbook shape for the Campaigns tab — one row per campaign with its
 * running total and donor count, which is what a committee reviewing
 * fundraising performance asks for.
 */
export function buildCampaignsExport(
  rows: readonly SerialCampaignRow[],
  meta: readonly { label: string; value: string }[],
): ExportSpec<SerialCampaignRow> {
  return {
    filename: 'donation-campaigns',
    title: 'Donation campaigns',
    subtitle: 'Freewill campaigns and what each has raised',
    meta,
    sheetName: 'Campaigns',
    orientation: 'landscape',
    rows,
    columns: [
      { header: '#', value: (r) => r.serial, width: 6, align: 'center' },
      { header: 'Campaign', value: (r) => r.name },
      { header: 'Scope', value: (r) => r.scopeName },
      { header: 'Event group', value: (r) => r.groupName ?? '' },
      { header: 'Raised', value: (r) => r.raised, numFmt: '#,##0', align: 'right', total: true },
      { header: 'Currency', value: (r) => r.currency, width: 10, align: 'center' },
      {
        header: 'Donations',
        value: (r) => r.donationCount,
        width: 11,
        align: 'right',
        total: true,
      },
      {
        header: 'Average gift',
        value: (r) => (r.donationCount > 0 ? Math.round(r.raised / r.donationCount) : ''),
        numFmt: '#,##0',
        width: 13,
        align: 'right',
      },
      { header: 'Lifecycle', value: (r) => r.lifecycle ?? '', width: 11 },
      {
        header: 'Opens',
        value: (r) => (r.openDate ? new Date(r.openDate) : null),
        width: 13,
        numFmt: 'dd mmm yyyy',
      },
      {
        header: 'Closes',
        value: (r) => (r.closeDate ? new Date(r.closeDate) : null),
        width: 13,
        numFmt: 'dd mmm yyyy',
      },
      { header: 'Description', value: (r) => r.description ?? '' },
    ],
  };
}
