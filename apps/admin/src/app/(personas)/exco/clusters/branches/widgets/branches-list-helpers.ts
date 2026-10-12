import type {
  BranchesConfirmState,
  BranchesSerialRow,
  BranchRow,
  ChapterRow,
} from './branches-list-types';

export function buildBranchesConfirmTitle(confirm: BranchesConfirmState): string {
  if (!confirm) return '';
  const verb = confirm.kind === 'restore' ? 'Restore' : 'Archive';
  const n = confirm.targets.length;
  if (n === 1) return `${verb} ${confirm.targets[0]?.name ?? 'this branch'}?`;
  return `${verb} ${n} branches?`;
}

/**
 * Flatten branches into display rows, inserting each branch's chapters
 * immediately after when its row is expanded. Serial numbers only apply
 * to branches so they stay stable when a branch is opened.
 */
export function buildDisplayRows(args: {
  readonly branches: readonly BranchRow[];
  readonly chaptersByBranch: Map<string, ChapterRow[]>;
  readonly expanded: ReadonlySet<string>;
}): readonly BranchesSerialRow[] {
  const { branches, chaptersByBranch, expanded } = args;
  const out: BranchesSerialRow[] = [];
  branches.forEach((b, index) => {
    const children = chaptersByBranch.get(b.id) ?? [];
    out.push({
      serial: index + 1,
      _kind: 'branch',
      _parent_id: null,
      _parent_slug: null,
      _has_children: children.length > 0,
      id: b.id,
      name: b.name,
      slug: b.slug,
      status: b.status,
      country_code: b.country_code,
      region: b.region,
      city: b.city,
      nickname: b.nickname,
      chapter_count: b.chapter_count,
      member_count: b.member_count,
      chapter_kind: null,
      currency_code: b.currency_code,
    });
    if (!expanded.has(b.id)) return;
    for (const c of children) {
      out.push({
        serial: null,
        _kind: 'chapter',
        _parent_id: c.parent_id,
        _parent_slug: b.slug,
        _has_children: false,
        id: c.id,
        name: c.name,
        slug: c.slug,
        status: c.status,
        country_code: c.country_code,
        region: c.region,
        city: c.city,
        nickname: null,
        chapter_count: null,
        member_count: c.member_count,
        chapter_kind: c.chapter_kind,
        currency_code: '',
      });
    }
  });
  return out;
}
