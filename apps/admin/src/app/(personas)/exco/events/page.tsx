import { StatsCard } from '@shesa/ui';

import { getServerClient } from '@/lib/supabase-server';

import { EventsListView, type EventRow } from './widgets/events-list-view';

export const dynamic = 'force-dynamic';

/**
 * Events list — Exco persona.
 *
 * Same siloed-admin-lens RLS as announcements (ADR-0041 + the
 * global-mainstream-admin → Mainstream mapping baked into
 * exco.events' policy).
 *
 * Stat cards: Total · Drafts · Published · Upcoming · Past.
 * Upcoming = published + start_at in the future. Past = end_at in
 * the past. "Live" (in-progress) is implicit — a live event is
 * published + past-start + not-yet-past-end; it isn't a top-level
 * stat card per the spec but shows on the row's timeline column.
 */
export default async function EventsPage() {
  const supabase = await getServerClient();

  const [{ data: eventRows }, { data: scopeRows }] = await Promise.all([
    supabase
      .schema('exco')
      .from('events')
      .select(
        'id,owner_scope_id,name,types,start_at,end_at,timezone,mode,status,venue_name,online_url,created_at,published_at,resolved_audience_size',
      )
      .order('start_at', { ascending: false }),
    supabase.schema('core').from('scopes').select('id, name'),
  ]);

  const scopeNameById = new Map((scopeRows ?? []).map((s) => [s.id, s.name]));

  const rows: EventRow[] = (eventRows ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    ownerScopeId: row.owner_scope_id,
    ownerScopeName: scopeNameById.get(row.owner_scope_id) ?? '—',
    types: (row.types ?? []) as readonly string[],
    startAt: row.start_at,
    endAt: row.end_at,
    timezone: row.timezone,
    mode: (row.mode ?? 'physical') as 'physical' | 'online' | 'hybrid',
    status: row.status,
    venueName: row.venue_name,
    onlineUrl: row.online_url,
    createdAt: row.created_at,
    publishedAt: row.published_at,
    membersReached: row.resolved_audience_size ?? 0,
  }));

  const now = Date.now();
  const total = rows.length;
  const drafts = rows.filter((r) => r.status === 'draft').length;
  const published = rows.filter((r) => r.status === 'published').length;
  const upcoming = rows.filter(
    (r) => r.status === 'published' && new Date(r.startAt).getTime() > now,
  ).length;
  const past = rows.filter(
    (r) => r.status === 'published' && new Date(r.endAt).getTime() < now,
  ).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Governance-flow calendar entries — meetings, AGMs, fundraisers, and more. You see only
          scopes you administer.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatsCard label="Total events" value={total} />
        <StatsCard label="Drafts" value={drafts} />
        <StatsCard label="Published" value={published} />
        <StatsCard label="Upcoming" value={upcoming} />
        <StatsCard label="Past" value={past} />
      </div>

      <EventsListView data={rows} />
    </div>
  );
}
