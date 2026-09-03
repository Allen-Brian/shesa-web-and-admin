'use server';

import { revalidatePath } from 'next/cache';

import { getServerClient } from '@/lib/supabase-server';

import type { ActionResult, SiteEventInput } from './site-event-action-types';

/**
 * CRUD for `cms.site_events`. The is_featured column is a unique
 * partial index — only one event can be featured — so setting a new
 * event as featured clears the flag off any previously featured row
 * BEFORE writing the target row. Kept explicit here so a race with
 * the DB constraint doesn't 500.
 *
 * Category assignments are managed as a table replacement (delete +
 * insert) inside a small chain, same pattern as News + Projects.
 */

async function clearOtherFeatured(
  supabase: Awaited<ReturnType<typeof getServerClient>>,
  excludeId: string | null,
): Promise<void> {
  const q = supabase
    .schema('cms')
    .from('site_events')
    .update({ is_featured: false } as never)
    .eq('is_featured', true);
  if (excludeId) q.neq('id', excludeId);
  await q;
}

async function replaceCategoryMap(
  supabase: Awaited<ReturnType<typeof getServerClient>>,
  eventId: string,
  categoryIds: readonly string[],
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error: delErr } = await supabase
    .schema('cms')
    .from('site_event_categories_map')
    .delete()
    .eq('event_id', eventId);
  if (delErr) return { ok: false, message: delErr.message };
  if (categoryIds.length === 0) return { ok: true };
  const rows = categoryIds.map((c) => ({ event_id: eventId, category_id: c }));
  const { error: insErr } = await supabase
    .schema('cms')
    .from('site_event_categories_map')
    .insert(rows as never);
  if (insErr) return { ok: false, message: insErr.message };
  return { ok: true };
}

function toDbBody(input: SiteEventInput) {
  const ticketing = input.hasTicketing;
  return {
    slug: input.slug.trim(),
    title: input.title.trim(),
    short_description: input.shortDescription?.trim() || null,
    description_html: input.descriptionHtml,
    banner_url: input.bannerUrl?.trim() || null,
    starts_at: input.startsAt,
    ends_at: input.endsAt ?? null,
    location: input.location?.trim() || null,
    city: input.city?.trim() || null,
    is_featured: input.isFeatured,
    has_ticketing: ticketing,
    ticket_url: ticketing ? input.ticketUrl?.trim() || null : null,
    ticket_price: ticketing ? (input.ticketPrice ?? null) : null,
    ticket_currency: ticketing ? input.ticketCurrency?.trim() || null : null,
    flyers: input.flyers,
    program: input.program,
    album_slug: input.albumSlug?.trim() || null,
  };
}

export async function createSiteEvent(
  input: SiteEventInput,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await getServerClient();
  if (input.isFeatured) await clearOtherFeatured(supabase, null);
  const { data, error } = await supabase
    .schema('cms')
    .from('site_events')
    .insert(toDbBody(input) as never)
    .select('id')
    .maybeSingle();
  if (error || !data) {
    return { ok: false, message: error?.message ?? 'Could not create event.' };
  }
  const eventId = (data as { id: string }).id;
  const mapRes = await replaceCategoryMap(supabase, eventId, input.categoryIds);
  if (!mapRes.ok) return { ok: false, message: mapRes.message };
  revalidatePath('/editor/site-events');
  revalidatePath('/events');
  return { ok: true, data: { id: eventId } };
}

export async function updateSiteEvent(id: string, input: SiteEventInput): Promise<ActionResult> {
  const supabase = await getServerClient();
  if (input.isFeatured) await clearOtherFeatured(supabase, id);
  const body = { ...toDbBody(input), updated_at: new Date().toISOString() };
  const { error } = await supabase
    .schema('cms')
    .from('site_events')
    .update(body as never)
    .eq('id', id);
  if (error) return { ok: false, message: error.message };
  const mapRes = await replaceCategoryMap(supabase, id, input.categoryIds);
  if (!mapRes.ok) return { ok: false, message: mapRes.message };
  revalidatePath('/editor/site-events');
  revalidatePath(`/editor/site-events/${id}/edit`);
  revalidatePath('/events');
  revalidatePath(`/events/${input.slug}`);
  return { ok: true };
}

export async function deleteSiteEvent(id: string): Promise<ActionResult> {
  const supabase = await getServerClient();
  const { error } = await supabase.schema('cms').from('site_events').delete().eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/editor/site-events');
  revalidatePath('/events');
  return { ok: true };
}

/** Mass-delete driven by the events table's MassActions. */
export async function deleteSiteEvents(
  ids: readonly string[],
): Promise<ActionResult<{ count: number }>> {
  if (ids.length === 0) return { ok: true, data: { count: 0 } };
  const supabase = await getServerClient();
  const { error } = await supabase.schema('cms').from('site_events').delete().in('id', ids);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/editor/site-events');
  revalidatePath('/events');
  return { ok: true, data: { count: ids.length } };
}
