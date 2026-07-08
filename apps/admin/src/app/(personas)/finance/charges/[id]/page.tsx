import { notFound, redirect } from 'next/navigation';

import { loadChargeDetail } from '@/lib/charges/load-charge-detail';
import { getServerClient } from '@/lib/supabase-server';

import { ChargeDetailView } from './widgets/charge-detail-view';

export const dynamic = 'force-dynamic';

interface Props {
  readonly params: Promise<{ id: string }>;
}

/**
 * Charge detail — the "who has paid" drill-down.
 *
 * Data loading lives in a shared server helper so the Exco read-only
 * mirror (/exco/finance-view/charges/[id]) can render the same view
 * without diverging query paths.
 */
export default async function ChargeDetailPage({ params }: Props) {
  const { id } = await params;

  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/finance/charges/${id}`);

  const data = await loadChargeDetail(id);
  if (!data) notFound();

  return <ChargeDetailView {...data} backLinkHref="/finance/charges" />;
}
