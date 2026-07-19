import { StatsCard } from '@shesa/ui';

import { getServerClient } from '@/lib/supabase-server';

import { AnnouncementsListView, type AnnouncementRow } from './widgets/announcements-list-view';

export const dynamic = 'force-dynamic';

/**
 * Announcements list — Exco persona.
 *
 * Reads exco.announcements filtered by admin-lens RLS (siloed on
 * owner_scope_id per ADR-0041, with global mainstream_admin mapped to
 * Mainstream — see migration 20260704160000).
 *
 * Members reached = resolved_audience_size on the row (snapshotted at
 * publish time by the announcements/publish Edge Function). Read
 * count is deferred until the notifications schema gains a read_at
 * column — flagged as a follow-up below.
 */
export default async function AnnouncementsPage() {
  const supabase = await getServerClient();

  const [{ data: announcementRows }, { data: scopeRows }] = await Promise.all([
    supabase
      .schema('exco')
      .from('announcements')
      .select(
        'id, owner_scope_id, title, status, channels, expires_at, created_at, published_at, resolved_audience_size',
      )
      .order('created_at', { ascending: false }),
    supabase.schema('core').from('scopes').select('id, name'),
  ]);

  const scopeNameById = new Map((scopeRows ?? []).map((s) => [s.id, s.name]));

  const rows: AnnouncementRow[] = (announcementRows ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    ownerScopeId: row.owner_scope_id,
    ownerScopeName: scopeNameById.get(row.owner_scope_id) ?? '—',
    status: row.status,
    channels: (row.channels ?? []) as ReadonlyArray<'in_app' | 'email' | 'forum'>,
    createdAt: row.created_at,
    publishedAt: row.published_at,
    expiresAt: row.expires_at,
    // resolved_audience_size is NULL for drafts (never published). Show
    // 0 rather than em-dash — the column reads "how many did we
    // address"; draft = 0 so far.
    membersReached: row.resolved_audience_size ?? 0,
    // Read count — deferred: notifications.notification_deliveries has
    // no read_at yet. Follow-up migration adds the column + a
    // mark-read Edge Function for the inbox client.
    readCount: 0,
  }));

  const total = rows.length;
  const published = rows.filter((r) => r.status === 'published').length;
  const drafts = rows.filter((r) => r.status === 'draft').length;

  const publishedRows = rows.filter((r) => r.status === 'published');
  const avgReads =
    publishedRows.length === 0
      ? 0
      : Math.round(
          (publishedRows.reduce((acc, r) => acc + r.readCount, 0) / publishedRows.length) * 10,
        ) / 10;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Announcements</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Rich-text messages published to a resolved audience of members. You see only scopes you
          administer.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="All announcements" value={total} />
        <StatsCard label="Published" value={published} />
        <StatsCard label="Drafts" value={drafts} />
        <StatsCard label="Avg reads / announcement" value={avgReads} />
      </div>

      <AnnouncementsListView data={rows} />
    </div>
  );
}
