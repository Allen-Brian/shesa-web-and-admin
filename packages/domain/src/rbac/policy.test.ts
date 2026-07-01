import { describe, expect, it, vi } from 'vitest';

import { createPolicy } from './index';
import type { PermissionChecker, PermissionKey } from '@shesa/types';

/**
 * `createPolicy` is a thin wrapper: `.can()` → `checker.has()`,
 * `.permissions()` → `checker.list()`. Tests here don't exercise the
 * real Postgres `has_permission` function — that's the pgTAP suite's
 * job (see supabase/tests/). What they DO cover:
 *
 *   - the wrapper forwards arguments unmodified
 *   - the return values pass through
 *
 * Both properties would silently break in a rename of the underlying
 * interface, which is the failure mode this test guards.
 */
describe('createPolicy', () => {
  const USER = 'user-1';
  const SCOPE = 'scope-1';
  const PERMISSION: PermissionKey = 'member.read';

  function makeChecker(overrides: Partial<PermissionChecker> = {}): PermissionChecker {
    return {
      has: vi.fn().mockResolvedValue(true),
      list: vi.fn().mockResolvedValue([]),
      ...overrides,
    };
  }

  it('can() forwards to checker.has() and passes the result through', async () => {
    const checker = makeChecker({ has: vi.fn().mockResolvedValue(true) });
    const policy = createPolicy(checker);

    await expect(policy.can(USER, SCOPE, PERMISSION)).resolves.toBe(true);
    expect(checker.has).toHaveBeenCalledWith(USER, SCOPE, PERMISSION);
  });

  it('can() surfaces a false decision unchanged', async () => {
    const checker = makeChecker({ has: vi.fn().mockResolvedValue(false) });
    const policy = createPolicy(checker);

    await expect(policy.can(USER, SCOPE, PERMISSION)).resolves.toBe(false);
  });

  it('permissions() forwards to checker.list() and passes the result through', async () => {
    const perms: PermissionKey[] = ['member.read', 'member.manage'];
    const checker = makeChecker({ list: vi.fn().mockResolvedValue(perms) });
    const policy = createPolicy(checker);

    await expect(policy.permissions(USER, SCOPE)).resolves.toEqual(perms);
    expect(checker.list).toHaveBeenCalledWith(USER, SCOPE);
  });
});
