'use server';

import { loadMemberContacts } from '@/lib/finance/member-contacts';
import { getServerClient } from '@/lib/supabase-server';

/**
 * Server Actions for the Reports page.
 *
 * Each report is a SECURITY DEFINER SQL function that already checks
 * finance.report / treasury.read at the scope. The action just calls
 * the RPC and returns typed rows for the client renderer.
 */

export type ActionResult<T> = { ok: true; data: T } | { ok: false; message: string };

export type ReportKey =
  | 'collections'
  | 'arrears'
  | 'treasury_statement'
  | 'payment_method_breakdown'
  | 'expense_report_by_category'
  | 'donation_report';

export interface CollectionsRow {
  charge_id: string;
  charge_name: string;
  shape: string;
  payment_count: number;
  total_collected: number;
}

export interface ArrearsRow {
  member_id: string;
  member_name: string;
  charge_id: string;
  charge_name: string;
  period_start: string | null;
  amount_owed: number;
  amount_paid: number;
  arrears: number;
  /**
   * Resolved after the RPC, not by it. Arrears is the one report whose
   * whole purpose is to be acted on — somebody has to contact each of
   * these people — and a list of names with no contact details makes
   * that a second piece of research per row.
   */
  member_email?: string | null;
  member_phone?: string | null;
  member_batch?: string | null;
  member_code?: string | null;
}

export interface TreasuryStatementRow {
  scope_id: string;
  currency: string;
  opening_balance: number;
  income_sum: number;
  expense_sum: number;
  closing_balance: number;
}

export interface PaymentMethodRow {
  method: string;
  payment_count: number;
  total_amount: number;
}

export interface ExpenseByCategoryRow {
  category_id: string | null;
  category_key: string | null;
  category_name: string | null;
  expense_count: number;
  total_amount: number;
}

export interface DonationReportRow {
  charge_id: string;
  charge_name: string;
  donation_count: number;
  named_donor_count: number;
  anonymous_count: number;
  total_donated: number;
}

interface ReportParams {
  readonly reportKey: ReportKey;
  readonly scopeId: string;
  readonly from?: string | null;
  readonly to?: string | null;
}

export async function runReport(
  params: ReportParams,
): Promise<
  ActionResult<
    | { report: 'collections'; rows: CollectionsRow[] }
    | { report: 'arrears'; rows: ArrearsRow[] }
    | { report: 'treasury_statement'; rows: TreasuryStatementRow[] }
    | { report: 'payment_method_breakdown'; rows: PaymentMethodRow[] }
    | { report: 'expense_report_by_category'; rows: ExpenseByCategoryRow[] }
    | { report: 'donation_report'; rows: DonationReportRow[] }
  >
> {
  const supabase = await getServerClient();

  // `undefined`, not `null`: these RPC params are DEFAULT NULL in SQL, so the
  // generated types make them optional. Omitting the key lets the function's
  // own default apply, which is what "no lower bound" means here.
  const fromArg = params.from ? new Date(params.from).toISOString() : undefined;
  const toArg = params.to ? new Date(params.to).toISOString() : new Date().toISOString();

  const { reportKey, scopeId } = params;

  try {
    switch (reportKey) {
      case 'collections': {
        const { data, error } = await supabase.schema('finance').rpc('get_collections', {
          p_scope_id: scopeId,
          p_from: fromArg,
          p_to: toArg,
        });
        if (error) return { ok: false, message: error.message };
        return {
          ok: true,
          data: { report: 'collections', rows: coerceRows(data) as unknown as CollectionsRow[] },
        };
      }
      case 'arrears': {
        const { data, error } = await supabase
          .schema('finance')
          .rpc('get_arrears', { p_scope_id: scopeId } as never);
        if (error) return { ok: false, message: error.message };
        const rows = coerceRows(data) as unknown as ArrearsRow[];
        return { ok: true, data: { report: 'arrears', rows: await withMemberContacts(rows) } };
      }
      case 'treasury_statement': {
        const { data, error } = await supabase.schema('finance').rpc('get_treasury_statement', {
          p_scope_id: scopeId,
          p_from: fromArg,
          p_to: toArg,
        });
        if (error) return { ok: false, message: error.message };
        return {
          ok: true,
          data: {
            report: 'treasury_statement',
            rows: coerceRows(data) as unknown as TreasuryStatementRow[],
          },
        };
      }
      case 'payment_method_breakdown': {
        const { data, error } = await supabase
          .schema('finance')
          .rpc('get_payment_method_breakdown', {
            p_scope_id: scopeId,
            p_from: fromArg,
            p_to: toArg,
          });
        if (error) return { ok: false, message: error.message };
        return {
          ok: true,
          data: {
            report: 'payment_method_breakdown',
            rows: coerceRows(data) as unknown as PaymentMethodRow[],
          },
        };
      }
      case 'expense_report_by_category': {
        const { data, error } = await supabase
          .schema('finance')
          .rpc('get_expense_report_by_category', {
            p_scope_id: scopeId,
            p_from: fromArg,
            p_to: toArg,
          });
        if (error) return { ok: false, message: error.message };
        return {
          ok: true,
          data: {
            report: 'expense_report_by_category',
            rows: coerceRows(data) as unknown as ExpenseByCategoryRow[],
          },
        };
      }
      case 'donation_report': {
        const { data, error } = await supabase.schema('finance').rpc('get_donation_report', {
          p_scope_id: scopeId,
          p_from: fromArg,
          p_to: toArg,
        });
        if (error) return { ok: false, message: error.message };
        return {
          ok: true,
          data: {
            report: 'donation_report',
            rows: coerceRows(data) as unknown as DonationReportRow[],
          },
        };
      }
    }
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Could not run report.',
    };
  }
}

function coerceRows(data: unknown): Record<string, unknown>[] {
  if (!Array.isArray(data)) return [];
  return data as Record<string, unknown>[];
}

/**
 * Attaches contact details to arrears rows.
 *
 * One extra round trip for the whole report rather than a widened RPC:
 * the reporting functions are SECURITY DEFINER and shared with the Exco
 * mirror, and adding personal columns to one would hand them to every
 * caller of it. Here the lookup runs as the signed-in user, so RLS on
 * `core.members` decides what comes back — somebody who cannot see a
 * member's phone number does not get it in their export either.
 */
async function withMemberContacts(rows: ArrearsRow[]): Promise<ArrearsRow[]> {
  const memberIds = Array.from(new Set(rows.map((r) => r.member_id).filter(Boolean)));
  if (memberIds.length === 0) return rows;

  const supabase = await getServerClient();
  const contacts = await loadMemberContacts(supabase, memberIds);

  return rows.map((r) => {
    const c = contacts.get(r.member_id);
    return {
      ...r,
      member_email: c?.email ?? null,
      member_phone: c?.phone ?? null,
      member_batch: c?.batchName ?? null,
      member_code: c?.memberCode ?? null,
    };
  });
}
