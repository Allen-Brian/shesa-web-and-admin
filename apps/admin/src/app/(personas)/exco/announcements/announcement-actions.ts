'use server';

import { revalidatePath } from 'next/cache';

import { AUDIENCE_ALL, AudienceDefinition } from '@shesa/domain/audience';

import { extractInvokeMessage } from '@/lib/edge-invoke';
import { getServerClient } from '@/lib/supabase-server';

/**
 * Server Actions for exco.announcements — the envelope layer per
 * ADR-0033. All mutations go through Edge Functions (announcements/*).
 * These actions do:
 *   - session resolution via getServerClient (from cookie)
 *   - light input normalization
 *   - invoke the right Edge Function
 *   - shape errors into a consistent { ok, message } result for
 *     `useActionState` on the form
 *   - revalidatePath after success
 *
 * The authoritative validation + permission checks live in the Edge
 * Functions per ADR-0033 Phase 2 refinement. This layer is glue.
 */

export type AnnouncementFormState =
  | { ok: true; id?: string; published?: boolean }
  | {
      ok: false;
      message?: string;
      fieldErrors?: Partial<Record<AnnouncementFormField, string>>;
      values?: Partial<Record<AnnouncementFormField, string>>;
    };

type AnnouncementFormField = 'ownerScopeId' | 'title' | 'body' | 'scheduledPublishAt';

interface CreateInput {
  readonly ownerScopeId: string;
  readonly title: string;
  readonly body: string;
  readonly audienceDefinition: AudienceDefinition;
  readonly channels: readonly ('in_app' | 'email' | 'forum')[];
  readonly scheduledPublishAt: string | null;
}

/**
 * Handles the create form. Reads `intent` (draft | schedule | publish)
 * from the submit button and either:
 *   - draft:    creates as `draft`
 *   - schedule: creates with `scheduled_publish_at` populated and status
 *               = 'scheduled' (Edge Function derives the status from the
 *               presence of scheduled_publish_at)
 *   - publish:  creates as draft, then immediately calls publish
 */
export async function createAnnouncement(
  _prev: AnnouncementFormState,
  formData: FormData,
): Promise<AnnouncementFormState> {
  const readString = (k: string) => {
    const raw = formData.get(k);
    return typeof raw === 'string' ? raw.trim() : '';
  };

  const ownerScopeId = readString('ownerScopeId');
  const title = readString('title');
  const body = readString('body');
  const audienceRaw = readString('audienceDefinitionJson');
  const scheduledPublishAtRaw = readString('scheduledPublishAt');
  const intent = readString('intent') as 'draft' | 'schedule' | 'publish' | '';

  const fieldErrors: Partial<Record<AnnouncementFormField, string>> = {};
  if (!ownerScopeId) fieldErrors.ownerScopeId = 'Choose the scope to publish under.';
  if (!title) fieldErrors.title = 'Title is required.';
  else if (title.length > 200) fieldErrors.title = 'Title must be under 200 characters.';

  // Schedule intent requires a datetime in the future.
  let scheduledPublishAt: string | null = null;
  if (intent === 'schedule') {
    if (!scheduledPublishAtRaw) {
      fieldErrors.scheduledPublishAt = 'Pick a date and time to schedule for.';
    } else {
      const when = new Date(scheduledPublishAtRaw);
      if (Number.isNaN(when.getTime())) {
        fieldErrors.scheduledPublishAt = 'Invalid schedule time.';
      } else if (when.getTime() <= Date.now()) {
        fieldErrors.scheduledPublishAt = 'Schedule time must be in the future.';
      } else {
        // Normalize to ISO 8601 for the Edge Function's z.string().datetime().
        scheduledPublishAt = when.toISOString();
      }
    }
  }

  // Parse the audience JSON from the AudienceSelector's hidden input.
  // Malformed shape → fall back to AUDIENCE_ALL (a broken hidden input
  // shouldn't block the create — the Edge Function will validate
  // again downstream).
  let audienceDefinition = AUDIENCE_ALL;
  if (audienceRaw) {
    try {
      const parsed = AudienceDefinition.safeParse(JSON.parse(audienceRaw));
      if (parsed.success) audienceDefinition = parsed.data;
    } catch {
      // JSON.parse failed — keep AUDIENCE_ALL fallback.
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors, values: { ownerScopeId, title, body } };
  }

  const channels: ('in_app' | 'email' | 'forum')[] = ['in_app'];
  const emailOn = formData.get('channelEmail') === 'on';
  const forumOn = formData.get('channelForum') === 'on';
  if (emailOn) channels.push('email');
  if (forumOn) channels.push('forum');

  const input: CreateInput = {
    ownerScopeId,
    title,
    body,
    audienceDefinition,
    channels,
    scheduledPublishAt,
  };

  const supabase = await getServerClient();
  const { data, error } = await supabase.functions.invoke('announcements/create', {
    body: {
      ownerScopeId: input.ownerScopeId,
      title: input.title,
      body: input.body,
      audienceDefinition: input.audienceDefinition,
      channels: input.channels,
      // scheduledPublishAt drives the Edge Function to insert with
      // status='scheduled'. Null / missing keeps default 'draft'.
      scheduledPublishAt: input.scheduledPublishAt,
    },
  });

  if (error) {
    return {
      ok: false,
      message: await extractInvokeMessage(error, 'Could not create the announcement.'),
      values: { ownerScopeId, title, body },
    };
  }

  const id = extractId(data);

  // "Publish now" intent — chain into the publish endpoint immediately
  // after create. Anything created here starts as 'draft'; publish
  // transitions to 'published' and fans out delivery rows.
  if (intent === 'publish' && id) {
    const publishRes = await supabase.functions.invoke('announcements/publish', {
      body: { id },
    });
    if (publishRes.error) {
      return {
        ok: false,
        message: await extractInvokeMessage(
          publishRes.error,
          'Announcement saved as draft, but publish failed. Try Publish from the list.',
        ),
        values: { ownerScopeId, title, body },
      };
    }
    revalidatePath('/exco/announcements');
    return { ok: true, id, published: true };
  }

  revalidatePath('/exco/announcements');
  return { ok: true, id: id ?? undefined };
}

/**
 * Publish a draft or scheduled announcement immediately. Fan-out
 * happens server-side in the Edge Function; this action just triggers
 * it and revalidates the list view.
 */
export async function publishAnnouncement(
  id: string,
): Promise<{ ok: boolean; message?: string; id: string }> {
  const supabase = await getServerClient();
  const { error } = await supabase.functions.invoke('announcements/publish', {
    body: { id },
  });
  if (error) {
    return { ok: false, id, message: await extractInvokeMessage(error, 'Could not publish.') };
  }
  revalidatePath('/exco/announcements');
  return { ok: true, id };
}

/**
 * Soft-archive an announcement. Delivery rows are retained; the row
 * itself transitions to status='archived'.
 */
export async function archiveAnnouncement(
  id: string,
): Promise<{ ok: boolean; message?: string; id: string }> {
  const supabase = await getServerClient();
  const { error } = await supabase.functions.invoke('announcements/archive', {
    body: { id },
  });
  if (error) {
    return { ok: false, id, message: await extractInvokeMessage(error, 'Could not archive.') };
  }
  revalidatePath('/exco/announcements');
  return { ok: true, id };
}

function extractId(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const rec = data as { id?: unknown; data?: { id?: unknown } };
  const nested = rec.data?.id;
  const flat = rec.id;
  return typeof nested === 'string' ? nested : typeof flat === 'string' ? flat : null;
}
