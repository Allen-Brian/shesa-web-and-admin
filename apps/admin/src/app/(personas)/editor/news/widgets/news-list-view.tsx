'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Layers } from 'lucide-react';

import {
  Button,
  ConfirmDialog,
  DataTable,
  EntityTablePanel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
  type GridApi,
  type MassActions,
} from '@shesa/ui';

import { deleteArticles } from '../actions/articles';
import { ArticleCategoryManagerDialog } from './article-category-manager-dialog';
import type { ArticleRow, ArticleStatus, CategoryRow } from './news-widget-types';
import { useArticleColumns, type ArticleSerialRow } from './use-article-columns';

interface Props {
  readonly articles: readonly ArticleRow[];
  readonly categories: readonly CategoryRow[];
}

/**
 * Editor's News list — DataTable + EntityTablePanel + MassActions,
 * same shape as the Leadership tabs. Clicking a row opens the edit
 * page; the New button routes to the create page. Category CRUD is
 * one click away in the manager dialog.
 */
export function NewsListView({ articles, categories }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ArticleStatus>('all');
  const [gridApi, setGridApi] = useState<GridApi<ArticleSerialRow> | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [confirmMulti, setConfirmMulti] = useState<readonly ArticleSerialRow[]>([]);

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const flat = useMemo<ArticleSerialRow[]>(() => {
    return articles.map((a, i) => ({
      ...a,
      serial: i + 1,
      categoryLabels: a.categoryIds
        .map((id) => categoryById.get(id)?.name)
        .filter(Boolean)
        .join(', '),
    }));
  }, [articles, categoryById]);

  const filtered = useMemo<ArticleSerialRow[]>(() => {
    const q = search.trim().toLowerCase();
    return flat.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        r.authorName.toLowerCase().includes(q) ||
        r.categoryLabels.toLowerCase().includes(q) ||
        !!r.excerpt?.toLowerCase().includes(q)
      );
    });
  }, [flat, search, statusFilter]);

  const runDelete = (rows: readonly { readonly id: string; readonly title: string }[]) => {
    startTransition(async () => {
      const res = await deleteArticles(rows.map((r) => r.id));
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(
        rows.length === 1 ? `"${rows[0]!.title}" removed.` : `Removed ${rows.length} articles.`,
      );
      setConfirmMulti([]);
      router.refresh();
    });
  };

  const columnDefs = useArticleColumns({
    onOpen: (row) => router.push(`/editor/news/${row.id}/edit`),
  });

  const massActions = useMemo<MassActions<ArticleSerialRow>>(
    () => ({
      itemName: 'article',
      pluralItemName: 'articles',
      onDelete: (selected) => setConfirmMulti(selected),
    }),
    [],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Curate the public News page. Featured articles surface in the hero carousel; drafts +
          scheduled entries stay hidden until they&apos;re published.
        </p>
        <Button variant="outline" size="sm" onClick={() => setManageOpen(true)}>
          <Layers className="h-4 w-4" />
          Manage categories
        </Button>
      </div>

      <EntityTablePanel
        count={filtered.length}
        countLabel={filtered.length === 1 ? 'article' : 'articles'}
        search={search}
        onSearchChange={setSearch}
        gridApi={gridApi}
        canCreate
        onCreate={() => router.push('/editor/news/new')}
        createLabel="New article"
        filters={
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as 'all' | ArticleStatus)}
          >
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <DataTable<ArticleSerialRow>
        rowData={filtered}
        columnDefs={columnDefs}
        getRowId={(p) => p.data.id}
        onGridReady={(e) => setGridApi(e.api)}
        showColumnPicker={false}
        pageSize={6}
        selectable
        rowHeight={92}
        massActions={massActions}
        onRowClicked={(e) => e.data && router.push(`/editor/news/${e.data.id}/edit`)}
      />

      <ArticleCategoryManagerDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        categories={categories}
      />

      <ConfirmDialog
        open={confirmMulti.length > 0}
        title={`Remove ${confirmMulti.length} article${confirmMulti.length === 1 ? '' : 's'}?`}
        description="They'll all disappear from the public News page immediately."
        confirmLabel={pending ? 'Removing…' : 'Remove all'}
        onConfirm={() => runDelete(confirmMulti)}
        onCancel={() => setConfirmMulti([])}
      />
    </div>
  );
}
