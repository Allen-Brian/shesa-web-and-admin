import { describe, expect, it } from 'vitest';

import { canRevokeAdmin, type AssignmentLike } from './last-admin';

const NOW = new Date('2026-07-02T12:00:00Z');

function assignment(
  overrides: Partial<AssignmentLike> & Pick<AssignmentLike, 'id' | 'userId' | 'roleKey'>,
): AssignmentLike {
  return {
    scopeId: 'scope-a',
    revokedAt: null,
    startsAt: '2026-01-01T00:00:00Z',
    endsAt: null,
    ...overrides,
  };
}

describe('canRevokeAdmin', () => {
  it('blocks self-revoke of an admin role', () => {
    const target = assignment({ id: 't1', userId: 'user-a', roleKey: 'branch_admin' });
    const other = assignment({ id: 't2', userId: 'user-b', roleKey: 'branch_admin' });
    const result = canRevokeAdmin(target, [target, other], 'user-a', NOW);
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toBe('SELF_REVOKE');
  });

  it('blocks last-admin revoke', () => {
    const only = assignment({ id: 't1', userId: 'user-a', roleKey: 'branch_admin' });
    const result = canRevokeAdmin(only, [only], 'admin-b', NOW);
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toBe('LAST_ADMIN');
  });

  it('allows revoke when another active admin exists at the scope', () => {
    const target = assignment({ id: 't1', userId: 'user-a', roleKey: 'branch_admin' });
    const other = assignment({ id: 't2', userId: 'user-b', roleKey: 'branch_admin' });
    const result = canRevokeAdmin(target, [target, other], 'admin-c', NOW);
    expect(result.allowed).toBe(true);
  });

  it('ignores admin holders at other scopes when counting', () => {
    const target = assignment({
      id: 't1',
      userId: 'user-a',
      roleKey: 'branch_admin',
      scopeId: 'scope-a',
    });
    const otherScope = assignment({
      id: 't2',
      userId: 'user-b',
      roleKey: 'branch_admin',
      scopeId: 'scope-b',
    });
    const result = canRevokeAdmin(target, [target, otherScope], 'admin-c', NOW);
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toBe('LAST_ADMIN');
  });

  it('ignores finance role toward the admin count', () => {
    const target = assignment({ id: 't1', userId: 'user-a', roleKey: 'branch_admin' });
    const finance = assignment({ id: 't2', userId: 'user-b', roleKey: 'finance' });
    const result = canRevokeAdmin(target, [target, finance], 'admin-c', NOW);
    expect(result.allowed).toBe(false); // finance doesn't count → last admin
  });

  it('ignores revoked / expired admins toward the count', () => {
    const target = assignment({ id: 't1', userId: 'user-a', roleKey: 'branch_admin' });
    const revoked = assignment({
      id: 't2',
      userId: 'user-b',
      roleKey: 'branch_admin',
      revokedAt: '2026-06-01T00:00:00Z',
    });
    const expired = assignment({
      id: 't3',
      userId: 'user-c',
      roleKey: 'branch_admin',
      endsAt: '2026-06-30T00:00:00Z', // before NOW
    });
    const result = canRevokeAdmin(target, [target, revoked, expired], 'admin-d', NOW);
    expect(result.allowed).toBe(false); // both are inactive → last admin
  });

  it('allows revoke of a non-admin role regardless of counts', () => {
    const target = assignment({ id: 't1', userId: 'user-a', roleKey: 'editor' });
    const result = canRevokeAdmin(target, [target], 'admin-b', NOW);
    expect(result.allowed).toBe(true);
  });

  it('exempts global grants (scope_id null) from all checks', () => {
    const target = assignment({
      id: 't1',
      userId: 'user-a',
      roleKey: 'recruiter',
      scopeId: null,
    });
    // Even a self-revoke of a global grant is allowed — global isn't admin.
    const result = canRevokeAdmin(target, [target], 'user-a', NOW);
    expect(result.allowed).toBe(true);
  });
});
