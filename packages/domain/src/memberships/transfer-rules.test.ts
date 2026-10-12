import { describe, expect, it } from 'vitest';

import { canApproveTransfer, canRequestTransfer, canTransfer } from './transfer-rules';

const branch = (id = 'b1') => ({ scopeId: id, scopeType: 'branch' as const });
const autonomousChapter = (id = 'c1') => ({
  scopeId: id,
  scopeType: 'chapter' as const,
  chapterKind: 'autonomous' as const,
});
const groupingChapter = (id = 'c2') => ({
  scopeId: id,
  scopeType: 'chapter' as const,
  chapterKind: 'grouping' as const,
});
const batch = (id = 'bt1') => ({ scopeId: id, scopeType: 'batch' as const });

describe('canRequestTransfer', () => {
  it('allows branch → branch', () => {
    const r = canRequestTransfer(branch('b1'), branch('b2'));
    expect(r.allowed).toBe(true);
  });

  it('allows branch → autonomous chapter', () => {
    const r = canRequestTransfer(branch(), autonomousChapter());
    expect(r.allowed).toBe(true);
  });

  it('allows autonomous chapter → branch', () => {
    const r = canRequestTransfer(autonomousChapter(), branch());
    expect(r.allowed).toBe(true);
  });

  it('allows autonomous chapter → autonomous chapter', () => {
    const r = canRequestTransfer(autonomousChapter('c1'), autonomousChapter('c2'));
    expect(r.allowed).toBe(true);
  });

  it('rejects transfer into a grouping chapter', () => {
    const r = canRequestTransfer(branch(), groupingChapter());
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.reason).toMatch(/destination must be/);
  });

  it('rejects transfer from a grouping chapter', () => {
    const r = canRequestTransfer(groupingChapter(), branch());
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.reason).toMatch(/source must be/);
  });

  it('rejects transfer into a batch (non-geographic scope)', () => {
    const r = canRequestTransfer(branch(), batch());
    expect(r.allowed).toBe(false);
  });

  it('rejects source = destination', () => {
    const r = canRequestTransfer(branch('b1'), branch('b1'));
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.reason).toMatch(/same scope/);
  });
});

describe('canTransfer (deprecated alias)', () => {
  it('behaves identically to canRequestTransfer', () => {
    expect(canTransfer(branch('b1'), branch('b2'))).toEqual(
      canRequestTransfer(branch('b1'), branch('b2')),
    );
  });
});

describe('canApproveTransfer', () => {
  it('allows approval when destination is a branch and actor has membership.transfer', () => {
    const r = canApproveTransfer({
      destination: branch(),
      actorHasMembershipTransferAtDestination: true,
    });
    expect(r.allowed).toBe(true);
  });

  it('allows approval when destination is an autonomous chapter and actor has the permission', () => {
    const r = canApproveTransfer({
      destination: autonomousChapter(),
      actorHasMembershipTransferAtDestination: true,
    });
    expect(r.allowed).toBe(true);
  });

  it('rejects when destination is a grouping chapter', () => {
    const r = canApproveTransfer({
      destination: groupingChapter(),
      actorHasMembershipTransferAtDestination: true,
    });
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.reason).toMatch(/destination must be/);
  });

  it('rejects when actor lacks membership.transfer at destination', () => {
    const r = canApproveTransfer({
      destination: branch(),
      actorHasMembershipTransferAtDestination: false,
    });
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.reason).toMatch(/membership.transfer/);
  });
});
