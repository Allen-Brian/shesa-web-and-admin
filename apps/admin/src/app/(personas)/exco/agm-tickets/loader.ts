import { getServerClient } from '@/lib/supabase-server';

import type { AgmTicketRow } from './widgets/types';

interface RawTicket {
  readonly id: string;
  readonly code: string;
  readonly full_name: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly amount_xaf: number | string;
  readonly payment_option: string;
  readonly status: 'issued' | 'paid' | 'cancelled';
  readonly notes: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

function toNum(v: number | string): number {
  if (typeof v === 'number') return v;
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Loader for both the Site Administrator (exco) and Finance persona
 * AGM ticket pages. Same query, same shape — the two personas just
 * render slightly different columns and filters over the same list.
 */
export async function loadAgmTickets(): Promise<readonly AgmTicketRow[]> {
  const supabase = await getServerClient();
  const { data } = await supabase
    .schema('cms' as never)
    .from('agm_tickets' as never)
    .select(
      'id, code, full_name, email, phone, amount_xaf, payment_option, status, notes, created_at, updated_at',
    )
    .order('created_at', { ascending: false });

  return ((data ?? []) as RawTicket[]).map((r): AgmTicketRow => ({
    id: r.id,
    code: r.code,
    fullName: r.full_name,
    email: r.email,
    phone: r.phone,
    amountXaf: toNum(r.amount_xaf),
    paymentOption: r.payment_option,
    status: r.status,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}
