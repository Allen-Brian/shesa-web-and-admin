import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import QRCode from 'qrcode';

import { ReceiptCard } from '@/components/agm/receipt-card';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

interface Params {
  readonly code: string;
}

interface RawTicket {
  readonly code: string;
  readonly full_name: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly amount_xaf: number | string;
  readonly payment_option: string;
  readonly status: 'issued' | 'paid' | 'cancelled';
  readonly created_at: string;
}

async function loadTicket(code: string): Promise<RawTicket | null> {
  const supabase = await getServerClient();
  const { data } = await supabase
    .schema('cms' as never)
    .from('agm_tickets' as never)
    .select('code, full_name, email, phone, amount_xaf, payment_option, status, created_at')
    .eq('code', code)
    .maybeSingle();
  return (data as RawTicket | null) ?? null;
}

export async function generateMetadata({
  params,
}: {
  readonly params: Promise<Params>;
}): Promise<Metadata> {
  const { code } = await params;
  return { title: `AGM 2026 Ticket · ${code} · SHESA` };
}

export default async function ReceiptPage({ params }: { readonly params: Promise<Params> }) {
  const { code } = await params;
  const ticket = await loadTicket(code);
  if (!ticket) notFound();

  // Encode the receipt URL (not just the code) so scanning at check-in
  // opens the receipt directly for verification.
  const receiptUrl = `https://shesaconnect.com/agm-2026/receipt/${ticket.code}`;
  const qrSvg = await QRCode.toString(receiptUrl, {
    type: 'svg',
    margin: 0,
    color: {
      dark: '#111111',
      light: '#00000000',
    },
    errorCorrectionLevel: 'M',
  });

  return (
    <main className="relative min-h-screen bg-white">
      <ReceiptCard ticket={ticket} qrSvg={qrSvg} />
    </main>
  );
}
