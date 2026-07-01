# RBAC — adding permissions, roles, mappings

Shesa's authorization model is scope-aware: a role assignment grants a set of permissions AT a specific scope (`core.scopes` row). Traversal walks the scope tree (Mainstream → Branch → Chapter → Batch → House / Sector) — a role at a parent scope grants the implied permissions at every child scope.

The core primitives live in migrations `20260629210214_init_core_rbac.sql` and `20260629210215_init_core_permission_checker.sql`. The permission checker (`core.has_permission`) is `SECURITY DEFINER` with a pinned `search_path` so RLS policies can safely call it without recursing.

## Add a permission

1. Migration: `pnpm db:migrate:new add_<something>_permission`
2. Insert into `core.permissions`:

   ```sql
   INSERT INTO core.permissions (key, description)
   VALUES ('member.transfer', 'Move a member between Chapters');
   ```

3. Mirror the key in `packages/types/src/permission-key.ts` so TypeScript call-sites are type-safe:

   ```ts
   export const PERMISSION_KEYS = [...'member.transfer'] as const;
   ```

4. If it's a permission an existing role should already have, add the `role_permissions` mapping in the same migration.

## Add a role

Same migration file if it's tied to a shipping feature:

```sql
INSERT INTO core.roles (key, description) VALUES ('registrar', 'Manages member records');
```

Then map permissions:

```sql
INSERT INTO core.role_permissions (role_key, permission_key) VALUES
  ('registrar', 'member.read'),
  ('registrar', 'member.manage'),
  ('registrar', 'member.transfer');
```

Update `packages/types/src/role-key.ts`.

## Grant a role to a user

Runtime, via the `grant-role` Edge Function (Server Actions / apps hit this, not direct DB inserts):

```ts
await supabase.functions.invoke('grant-role', {
  body: {
    userId,
    scopeId,
    roleKey: 'registrar',
    // ends_at optional; role_history + audit_entries are written by triggers
  },
});
```

The Edge Function performs the `role.grant` permission check, writes `core.role_assignments`, and the trigger cascades an `audit_entries` row + a `core.role_history` mirror row.

## Test it

Every new permission / role should get at minimum a deny-path pgTAP test:

```sql
BEGIN;
SELECT plan(2);

-- deny path
SELECT is(core.has_permission('<unauthorized_user_id>', '<scope_id>', 'member.transfer'), false,
          'user without the role cannot transfer');

-- happy path: assign the role, then check
INSERT INTO core.role_assignments (user_id, scope_id, role_key)
VALUES ('<authorized_user_id>', '<scope_id>', 'registrar');

SELECT is(core.has_permission('<authorized_user_id>', '<scope_id>', 'member.transfer'), true,
          'user with the role can transfer');

SELECT * FROM finish();
ROLLBACK;
```

See `supabase/tests/rls_core.test.sql` for the full deny + happy shape.
