import { notFound, redirect } from 'next/navigation';

import { loadChargeDetail } from '@/lib/charges/load-charge-detail';
import { getServerClient } from '@/lib/supabase-server';

import { ChargeDetailView } from '../../../../charges/[id]/widgets/charge-detail-view';

export const dynamic = 'force-dynamic';

interface Props {
  readonly params: Promise<{ slug: string; chargeId: string }>;
}

/**
 * Contribution detail nested under the group shell — reuses the same
 * `ChargeDetailView` the mainstream Charges page opens for
 * consistency. Back-link points to the group so the operator stays
 * inside the group lens.
 */
export default async function GroupContributionDetailPage({ params }: Props) {
  const { slug, chargeId } = await params;

  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/finance/groups/${slug}/contributions/${chargeId}`);

  const data = await loadChargeDetail(chargeId);
  if (!data) notFound();

  return <ChargeDetailView {...data} backLinkHref={`/finance/groups/${slug}`} />;
}
