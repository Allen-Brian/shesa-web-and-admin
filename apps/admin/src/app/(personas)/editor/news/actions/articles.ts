'use server';

import { revalidatePath } from 'next/cache';

import { getServerClient } from '@/lib/supabase-server';

import type { ActionResult, ArticleInput } from './news-action-types';

/**
 * CRUD for `cms.articles`. Category assignments are managed as a
 * table replacement: create + update both send the FULL desired
 * category-id set, and we DELETE old + INSERT new inside a small
 * chain. RLS on `cms.article_categories_map` gates the writes.
 */

async function replaceCategoryMap(
  supabase: Awaited<ReturnType<typeof getServerClient>>,
  articleId: string,
  categoryIds: readonly string[],
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error: delErr } = await supabase
    .schema('cms')
    .from('article_categories_map')
    .delete()
    .eq('article_id', articleId);
  if (delErr) return { ok: false, message: delErr.message };
  if (categoryIds.length === 0) return { ok: true };
  const rows = categoryIds.map((c) => ({ article_id: articleId, category_id: c }));
  const { error: insErr } = await supabase
    .schema('cms')
    .from('article_categories_map')
    .insert(rows as never);
  if (insErr) return { ok: false, message: insErr.message };
  return { ok: true };
}

function toDbBody(input: ArticleInput) {
  return {
    slug: input.slug.trim(),
    title: input.title.trim(),
    excerpt: input.excerpt?.trim() || null,
    content_html: input.contentHtml,
    banner_url: input.bannerUrl?.trim() || null,
    author_name: input.authorName.trim(),
    author_title: input.authorTitle?.trim() || null,
    author_photo_url: input.authorPhotoUrl?.trim() || null,
    status: input.status,
    publish_at: input.publishAt ?? null,
    is_featured: input.isFeatured,
  };
}

export async function createArticle(input: ArticleInput): Promise<ActionResult<{ id: string }>> {
  const supabase = await getServerClient();
  const { data, error } = await supabase
    .schema('cms')
    .from('articles')
    .insert(toDbBody(input) as never)
    .select('id')
    .maybeSingle();
  if (error || !data) {
    return { ok: false, message: error?.message ?? 'Could not create article.' };
  }
  const articleId = (data as { id: string }).id;
  const mapRes = await replaceCategoryMap(supabase, articleId, input.categoryIds);
  if (!mapRes.ok) return { ok: false, message: mapRes.message };
  revalidatePath('/editor/news');
  revalidatePath('/news');
  return { ok: true, data: { id: articleId } };
}

export async function updateArticle(id: string, input: ArticleInput): Promise<ActionResult> {
  const supabase = await getServerClient();
  const body = { ...toDbBody(input), updated_at: new Date().toISOString() };
  const { error } = await supabase
    .schema('cms')
    .from('articles')
    .update(body as never)
    .eq('id', id);
  if (error) return { ok: false, message: error.message };
  const mapRes = await replaceCategoryMap(supabase, id, input.categoryIds);
  if (!mapRes.ok) return { ok: false, message: mapRes.message };
  revalidatePath('/editor/news');
  revalidatePath(`/editor/news/${id}/edit`);
  revalidatePath('/news');
  return { ok: true };
}

export async function deleteArticle(id: string): Promise<ActionResult> {
  const supabase = await getServerClient();
  const { error } = await supabase.schema('cms').from('articles').delete().eq('id', id);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/editor/news');
  revalidatePath('/news');
  return { ok: true };
}

/** Mass-delete driven by the news table's MassActions. */
export async function deleteArticles(
  ids: readonly string[],
): Promise<ActionResult<{ count: number }>> {
  if (ids.length === 0) return { ok: true, data: { count: 0 } };
  const supabase = await getServerClient();
  const { error } = await supabase.schema('cms').from('articles').delete().in('id', ids);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/editor/news');
  revalidatePath('/news');
  return { ok: true, data: { count: ids.length } };
}
