import { notFound, redirect } from 'next/navigation';

import { ChargeDetailView } from '@/app/(personas)/finance/charges/[id]/widgets/charge-detail-view';
import { loadChargeDetail } from '@/lib/charges/load-charge-detail';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

interface Props {
  readonly params: Promise<{ id: string }>;
}

/**
 * Exco global admin's read-only mirror of the Finance charge detail.
 *
 * Same widget as /finance/charges/[id] — data flows through the shared
 * server loader in @/lib/charges/load-charge-detail. Living under the
 * exco route keeps the Exco persona intact when the global admin
 * drills into a charge from the exco finance-view list; the sidebar,
 * URL, and back-link stay in Exco territory instead of quietly
 * switching to the Finance portal.
 *
 * Any edits still require the Finance role via the Finance portal —
 * this view is display + export only.
 */
export default async function ExcoChargeDetailPage({ params }: Props) {
  const { id } = await params;

  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/exco/finance-view/charges/${id}`);

  const data = await loadChargeDetail(id);
  if (!data) notFound();

  return <ChargeDetailView {...data} backLinkHref="/exco/finance-view/charges" />;
}
