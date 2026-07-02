import { describe, expect, it } from 'vitest';

import { canTransfer } from './transfer-rules';

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

describe('canTransfer', () => {
  it('allows branch → branch', () => {
    const r = canTransfer(branch('b1'), branch('b2'));
    expect(r.allowed).toBe(true);
  });

  it('allows branch → autonomous chapter', () => {
    const r = canTransfer(branch(), autonomousChapter());
    expect(r.allowed).toBe(true);
  });

  it('allows autonomous chapter → branch', () => {
    const r = canTransfer(autonomousChapter(), branch());
    expect(r.allowed).toBe(true);
  });

  it('allows autonomous chapter → autonomous chapter', () => {
    const r = canTransfer(autonomousChapter('c1'), autonomousChapter('c2'));
    expect(r.allowed).toBe(true);
  });

  it('rejects transfer into a grouping chapter', () => {
    const r = canTransfer(branch(), groupingChapter());
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.reason).toMatch(/destination must be/);
  });

  it('rejects transfer from a grouping chapter', () => {
    const r = canTransfer(groupingChapter(), branch());
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.reason).toMatch(/source must be/);
  });

  it('rejects transfer into a batch (non-geographic scope)', () => {
    const r = canTransfer(branch(), batch());
    expect(r.allowed).toBe(false);
  });

  it('rejects source = destination', () => {
    const r = canTransfer(branch('b1'), branch('b1'));
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.reason).toMatch(/same scope/);
  });
});
