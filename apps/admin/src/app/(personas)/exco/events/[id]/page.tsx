import { notFound, redirect } from 'next/navigation';

import { AudienceDefinition } from '@shesa/domain/audience';

import type { AudienceOptions } from '@/components/audience/audience-selector';
import { getServerClient } from '@/lib/supabase-server';

import {
  EventForm,
  type EventInitialProgramItem,
  type EventInitialValues,
  type OwnerScopeOption,
} from '../widgets/event-form';

export const dynamic = 'force-dynamic';

interface EventDetailPageProps {
  readonly params: Promise<{ readonly id: string }>;
}

/**
 * Event detail page — doubles as the edit page. Renders the same
 * EventForm used by /new with saved values pre-populated. Ownership
 * scope is fixed at creation and is display-only here; every other
 * field is editable while the row is draft or scheduled. The
 * events/update Edge Function refuses non-editable states so the
 * server enforces the guard even if the UI is bypassed.
 *
 * RLS on exco.events enforces the siloed lens (ADR-0041 + Mainstream
 * mapping for global mainstream_admin). If the caller can't see the
 * row, this 404s.
 */
export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = await params;
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/exco/events/${id}`);

  const [{ data: eventRow }, { data: programRows }] = await Promise.all([
    supabase
      .schema('exco')
      .from('events')
      .select(
        'id,owner_scope_id,name,description,types,start_at,end_at,timezone,mode,status,venue_name,venue_address,venue_map_url,online_url,advert_image_urls,audience_definition,rsvp_enabled,reminder_cadence,reminder_start_at,reminder_custom_message,scheduled_publish_at',
      )
      .eq('id', id)
      .maybeSingle(),
    supabase
      .schema('exco')
      .from('event_program_items')
      .select('starts_at,title,detail,sort_order')
      .eq('event_id', id)
      .order('sort_order', { ascending: true })
      .order('starts_at', { ascending: true }),
  ]);

  if (!eventRow) notFound();

  // Owner scopes — mirrors /new. Duplicated for now; extract when a
  // third consumer shows up.
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
  // Always include the event's own owner so the read-only display
  // renders correctly even if the caller doesn't administer that scope
  // themselves (they may have a broader lens via mainstream_admin).
  activeAdminScopeIds.push(eventRow.owner_scope_id);
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

  // Audience options.
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

  const programItems: readonly EventInitialProgramItem[] = (programRows ?? []).map((p) => ({
    startsAt: p.starts_at,
    title: p.title,
    detail: p.detail,
  }));

  // audience_definition is stored as jsonb — validate before handing
  // to the AudienceSelector so a mis-typed row can't crash the picker.
  const parsedAudience = AudienceDefinition.safeParse(eventRow.audience_definition);
  const initial: EventInitialValues = {
    id: eventRow.id,
    ownerScopeId: eventRow.owner_scope_id,
    name: eventRow.name,
    description: eventRow.description ?? '',
    types: (eventRow.types ?? []) as readonly EventInitialValues['types'][number][],
    startAt: eventRow.start_at,
    endAt: eventRow.end_at,
    timezone: eventRow.timezone,
    venueName: eventRow.venue_name,
    venueAddress: eventRow.venue_address,
    venueMapUrl: eventRow.venue_map_url,
    onlineUrl: eventRow.online_url,
    advertImageUrls: (eventRow.advert_image_urls ?? []) as readonly string[],
    rsvpEnabled: eventRow.rsvp_enabled,
    reminderCadence: eventRow.reminder_cadence as EventInitialValues['reminderCadence'],
    reminderStartAt: eventRow.reminder_start_at,
    reminderCustomMessage: eventRow.reminder_custom_message,
    scheduledPublishAt: eventRow.scheduled_publish_at,
    status: eventRow.status,
    programItems,
    audienceDefinition: parsedAudience.success ? parsedAudience.data : null,
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <EventForm
        mode="edit"
        initial={initial}
        ownerScopes={ownerScopes}
        audienceOptions={audienceOptions}
      />
    </div>
  );
}
