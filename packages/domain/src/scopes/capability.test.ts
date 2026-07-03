import { describe, expect, it } from 'vitest';

import { resolveScopeCapabilities } from './capability';

describe('resolveScopeCapabilities', () => {
  it('grants full authority to a mainstream scope', () => {
    const caps = resolveScopeCapabilities({ scopeType: 'mainstream' });
    expect(caps.canManageMembers).toBe(true);
    expect(caps.canHaveTreasury).toBe(true);
    expect(caps.canCreateBindingDues).toBe(true);
    expect(caps.canHaveWebsitePage).toBe(true);
    expect(caps.canHaveForum).toBe(true);
    expect(caps.canLabelActivePassive).toBe(true);
  });

  it('grants full authority to a branch scope', () => {
    const caps = resolveScopeCapabilities({ scopeType: 'branch' });
    expect(caps.canManageMembers).toBe(true);
    expect(caps.canHaveTreasury).toBe(true);
  });

  it('treats an autonomous chapter like a small branch', () => {
    const caps = resolveScopeCapabilities({
      scopeType: 'chapter',
      chapterKind: 'autonomous',
    });
    expect(caps.canManageMembers).toBe(true);
    expect(caps.canHaveTreasury).toBe(true);
    expect(caps.canCreateBindingDues).toBe(true);
  });

  it('strips manage/treasury/dues from a grouping chapter', () => {
    const caps = resolveScopeCapabilities({
      scopeType: 'chapter',
      chapterKind: 'grouping',
    });
    expect(caps.canManageMembers).toBe(false);
    expect(caps.canHaveTreasury).toBe(false);
    expect(caps.canCreateBindingDues).toBe(false);
    // But the grouping chapter can still have a page + forum for cohesion.
    expect(caps.canHaveWebsitePage).toBe(true);
    expect(caps.canHaveForum).toBe(true);
  });

  it('gives batches member management + page + forum but no money', () => {
    const caps = resolveScopeCapabilities({ scopeType: 'batch' });
    expect(caps.canManageMembers).toBe(true);
    expect(caps.canHaveTreasury).toBe(false);
    expect(caps.canCreateBindingDues).toBe(false);
    expect(caps.canHaveWebsitePage).toBe(true);
    expect(caps.canHaveForum).toBe(true);
  });

  it('gives houses page + forum only', () => {
    const caps = resolveScopeCapabilities({ scopeType: 'house' });
    expect(caps.canManageMembers).toBe(false);
    expect(caps.canHaveTreasury).toBe(false);
    expect(caps.canHaveWebsitePage).toBe(true);
    expect(caps.canHaveForum).toBe(true);
  });

  it('gives networks no capabilities (labels, not org units)', () => {
    const caps = resolveScopeCapabilities({ scopeType: 'network' });
    expect(caps.canManageMembers).toBe(false);
    expect(caps.canHaveTreasury).toBe(false);
    expect(caps.canHaveWebsitePage).toBe(false);
    expect(caps.canHaveForum).toBe(false);
    expect(caps.canLabelActivePassive).toBe(false);
  });
});
