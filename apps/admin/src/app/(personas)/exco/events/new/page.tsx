import { redirect } from 'next/navigation';

import type { AudienceOptions } from '@/components/audience/audience-selector';
import { getServerClient } from '@/lib/supabase-server';

import { EventForm, type OwnerScopeOption } from '../widgets/event-form';

export const dynamic = 'force-dynamic';

/**
 * Create-event page. Loads:
 *   - owner scopes the caller administers (global mainstream_admin is
 *     mapped to Mainstream, same as announcements).
 *   - Audience options — every scope-id list + distinct member
 *     residence strings.
 */
export default async function NewEventPage() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/exco/events/new');

  // Owner scopes — same query shape as announcements/new. Duplicated
  // for now; extract into a shared helper when the third consumer
  // shows up (rule of three).
  const { data: assignments } = await supabase
    .schema('core')
    .from('role_assignments')
    .select('scope_id, ends_at, revoked_at, roles!inner(key)')
    .eq('user_id', user.id)
    .is('revoked_at', null);

  const now = Date.now();
  const activeAdminScopeIds: string[] = [];
  let hasGlobalMainstreamAdmin = false;
  for (const row of assignments ?? []) {
    const key = (row as { roles: { key: string } }).roles.key;
    if (!['mainstream_admin', 'branch_admin'].includes(key)) continue;
    const endsAt = (row as { ends_at: string | null }).ends_at;
    if (endsAt && new Date(endsAt).getTime() <= now) continue;
    const scopeId = (row as { scope_id: string | null }).scope_id;
    if (scopeId === null) {
      if (key === 'mainstream_admin') hasGlobalMainstreamAdmin = true;
      continue;
    }
    activeAdminScopeIds.push(scopeId);
  }

  const seenOwner = new Set<string>();
  const ownerScopes: OwnerScopeOption[] = [];
  if (activeAdminScopeIds.length > 0) {
    const { data: scopeRows } = await supabase
      .schema('core')
      .from('scopes')
      .select('id, name, scope_type')
      .in('id', activeAdminScopeIds);
    for (const s of scopeRows ?? []) {
      if (seenOwner.has(s.id)) continue;
      seenOwner.add(s.id);
      ownerScopes.push({ id: s.id, name: s.name, scopeType: s.scope_type });
    }
  }
  if (hasGlobalMainstreamAdmin) {
    const { data: mainstream } = await supabase
      .schema('core')
      .from('scopes')
      .select('id, name, scope_type')
      .eq('scope_type', 'mainstream')
      .maybeSingle();
    if (mainstream && !seenOwner.has(mainstream.id)) {
      seenOwner.add(mainstream.id);
      ownerScopes.push({
        id: mainstream.id,
        name: mainstream.name,
        scopeType: mainstream.scope_type,
      });
    }
  }
  ownerScopes.sort((a, b) => a.name.localeCompare(b.name));

  // Audience options — same shape used by announcements.
  const [
    { data: membershipScopeRows },
    { data: houseRows },
    { data: networkRows },
    { data: batchRows },
    { data: memberLocations },
  ] = await Promise.all([
    supabase
      .schema('core')
      .from('scopes')
      .select('id, name, scope_type, chapter_kind')
      .in('scope_type', ['branch', 'chapter'])
      .order('name'),
    supabase
      .schema('core')
      .from('scopes')
      .select('id, name')
      .eq('scope_type', 'house')
      .order('name'),
    supabase
      .schema('core')
      .from('scopes')
      .select('id, name')
      .eq('scope_type', 'network')
      .order('name'),
    supabase
      .schema('core')
      .from('scopes')
      .select('id, name, entry_year')
      .eq('scope_type', 'batch')
      .order('entry_year', { ascending: false }),
    supabase
      .schema('core')
      .from('members')
      .select('current_country, current_region_state, current_city'),
  ]);

  const membershipScopes = (membershipScopeRows ?? [])
    .filter(
      (r) =>
        r.scope_type === 'branch' ||
        (r.scope_type === 'chapter' && r.chapter_kind === 'autonomous'),
    )
    .map((r) => ({ id: r.id, label: r.name }));

  const countrySet = new Set<string>();
  const regionSet = new Set<string>();
  const citySet = new Set<string>();
  const tripleSeen = new Set<string>();
  const locationTriples: Array<{
    country: string | null;
    region: string | null;
    city: string | null;
  }> = [];
  for (const m of memberLocations ?? []) {
    if (m.current_country) countrySet.add(m.current_country);
    if (m.current_region_state) regionSet.add(m.current_region_state);
    if (m.current_city) citySet.add(m.current_city);
    const key = `${m.current_country ?? ''}|${m.current_region_state ?? ''}|${m.current_city ?? ''}`;
    if (!tripleSeen.has(key)) {
      tripleSeen.add(key);
      locationTriples.push({
        country: m.current_country ?? null,
        region: m.current_region_state ?? null,
        city: m.current_city ?? null,
      });
    }
  }

  const countries = Array.from(countrySet)
    .sort()
    .map((code) => ({ code, name: code }));
  const regions = Array.from(regionSet).sort();
  const cities = Array.from(citySet).sort();

  const audienceOptions: AudienceOptions = {
    membershipScopes,
    countries,
    locationTriples,
    regions,
    cities,
    houses: (houseRows ?? []).map((r) => ({ id: r.id, label: r.name })),
    networks: (networkRows ?? []).map((r) => ({ id: r.id, label: r.name })),
    batches: (batchRows ?? []).map((r) => ({ id: r.id, label: r.name })),
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <EventForm ownerScopes={ownerScopes} audienceOptions={audienceOptions} />
    </div>
  );
}
