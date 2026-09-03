# Runbook: reset the production database + apply migrations + seed

## What this is

The end-to-end procedure for wiping the production Supabase database,
re-applying every migration, loading `supabase/seed.sql`, and pushing the
project's auth configuration. Use this when standing up a fresh
production environment or when a controlled full reset is intentional.
This does NOT cover partial migrations or backup/restore — see the
platform provider's docs for those.

**Consequences of running this:** every row in every table is deleted.
Every user vanishes. Every finance record, member, invitation, and piece
of CMS content — gone. There is no rollback without a backup.

## When you need it

- Very first prod stand-up (nothing to lose).
- A staging-to-prod cutover where the prod database was a placeholder.
- A deliberate, announced full reset (a maintenance window with users
  informed in advance).

Never for "the app is misbehaving." That's a Supabase support ticket.

## What you end up with

Measured on 2026-09-03 by applying `supabase/migrations/` and
`supabase/seed.sql` to an empty database — no demo data:

| Thing                                              | Count                                                     |
| -------------------------------------------------- | --------------------------------------------------------- |
| `auth.users`                                       | 3 (`admin@`, `finance@`, `editor@shesaconnect.com`)       |
| `core.scopes`                                      | 88 — mainstream 1, branch 5, batch 74, house 4, network 4 |
| Branches                                           | Yaoundé, Douala, Buea, Tiko, Bamenda                      |
| Networks                                           | Legal, Santé, Tech, Education                             |
| RBAC                                               | 6 roles · 70 permissions · 143 bundles · 30 positions     |
| `finance.charge_categories`                        | 7                                                         |
| AGM 2026                                           | 1 group + 7 charges, all `active`, all closing 2026-11-15 |
| Members, memberships, payments, expenses, CMS rows | 0                                                         |

Chapters are created by hand in the Admin portal — the seed deliberately
creates none.

> ⚠️ **Member imports need networks, and the four above may not be the
> four you want.** The spreadsheet importer rejects any row whose
> `network` column doesn't match a seeded network name. Create the rest
> in the Admin portal before the first import.

## Prerequisites

- **Supabase CLI ≥ 2.100** (this repo pins one; run it via
  `pnpm exec supabase …`).
- **Access token** for the Supabase account that owns the project:
  Account → Access Tokens on supabase.com.
- **Project ref** — `pvedpfhlzojavgbqhmcu`. Read this twice: the account
  holds **two** projects and their names are the wrong way round.
  `pvedpfhlzojavgbqhmcu` is named _"SHESA Connect (Staging)"_ and is the
  live one — it is what `.env.production` points at, what the CLI is
  linked to, and what serves shesaconnect.com. `caecsutsqeaensuqtegs` is
  named _"SHESA Connect (Prod)"_, has been `INACTIVE` since 2026-07-08,
  and its API does not answer. **Never act on the name.**
- **DB password** for the prod project's Postgres role. Rotate it as
  step 1.
- **Local shell** at the repo root — this runbook uses relative paths.
- **Backup** if there's anything worth keeping. A full reset is
  irreversible without one.

## Steps

### 0. Rehearse it locally first

There is exactly one hosted project and it is production. There is no
staging to practise on, so practise on the local stack:

```bash
# In supabase/config.toml, temporarily narrow the seed list to the
# production seed only — the default also loads seed-demo.sql:
#   sql_paths = ["./seed.sql"]
pnpm db:reset --target local
pnpm db:test          # 32 files, 319 assertions — all must pass
# then restore: sql_paths = ["./seed.sql", "./seed-demo.sql"]
```

If the counts in "What you end up with" don't match locally, stop. They
will not match in production either.

### 1. Rotate the DB password (do this first)

If the current password has been shared in a chat log, PR, or ticket,
rotate it now. Supabase → Project settings → Database → Reset database
password. Use an alphanumeric-only replacement — characters like `$`
need URL-encoding in the connection string and break shells that don't
quote it consistently.

Update it in every store that references it:

- Vercel: `admin-prod` + `web-prod` → Environment Variables →
  `SUPABASE_DB_URL`.
- GitHub Actions repo secrets → same variable name.
- Your local `.env.production` (untracked; it must stay that way).

### 2. Log the CLI into the Supabase account

```bash
pnpm exec supabase login
```

Paste the access token when prompted. This writes
`~/.supabase/access-token` and persists across runs.

### 3. Link this repo to the prod project

```bash
pnpm exec supabase link --project-ref pvedpfhlzojavgbqhmcu
cat supabase/.temp/project-ref   # confirm
```

Confirm it prompted for the DB password (the newly rotated one).

### 4. Export anything you actually want to keep

Nominally the data is disposable, but the AGM is live and taking
registrations. A registration someone acted on is not disposable:

```bash
psql "$SUPABASE_DB_URL" -c "\copy (SELECT * FROM cms.agm_registrations) TO 'agm-registrations-backup.csv' CSV HEADER"
```

### 5. Reset the prod database and run every migration

```bash
pnpm exec supabase db reset --linked --no-seed
```

- `--linked` targets the remote project you just linked.
- `--no-seed` is **required**. `config.toml` lists both `seed.sql` and
  `seed-demo.sql`, and the demo seed carries 160 fake members, a year of
  synthetic finance history and placeholder CMS content. Letting the CLI
  seed would put all of it in production.

The CLI will:

1. Prompt you to confirm the destructive action — read the project ref
   in the prompt out loud before typing `y`. Wrong project = disaster.
2. Drop and recreate the app schemas.
3. Replay every file in `supabase/migrations/` in order — three baseline
   files plus whatever has landed since.

Expected output ends with `Finished supabase db reset`.

### 6. Load the production seed

```bash
psql "$SUPABASE_DB_URL" -f supabase/seed.sql
```

`SUPABASE_DB_URL` is the connection string rebuilt with the rotated
password: Supabase → Project settings → Database → Connection string →
URI, with the password pasted into the `[YOUR-PASSWORD]` placeholder.

Expected output: a quiet run with a handful of `INSERT 0 N` lines. Any
`ERROR:` line is a real failure — read it before doing anything else.

**Do not run `supabase/seed-demo.sql` against production.** It exists
only for local development.

### 7. Fix the auth configuration

`config.toml` does not propagate on its own. The hosted project's auth
settings were configured by hand and had drifted badly — on 2026-09-03,
before the cutover, the live project reported:

| Setting                        | Was                     | Why it mattered                                                                                                  |
| ------------------------------ | ----------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `disable_signup`               | `false`                 | Open self-registration on an invite-only platform, reachable with the anon key.                                  |
| `site_url`                     | `http://localhost:3000` | **Every invite and recovery email built links to localhost.** Nobody could accept an invite or reset a password. |
| `uri_allow_list`               | `""`                    | No redirect target was permitted, so `redirectTo` always fell back to site_url.                                  |
| `password_min_length`          | `6`                     | The reset-password form has always required 8.                                                                   |
| `password_required_characters` | none                    | —                                                                                                                |

**Do not use `supabase config push` for this.** It sends far more than
the auth block — `[db.pooler]`, `[storage]`, `[api]` and
`[db.network_restrictions]` all go with it, and this repo's values for
those describe the _local_ stack. `[db.pooler] enabled = false` alone is
enough to be alarming when `SUPABASE_DB_URL` points at the pooler.

Patch only the auth block, through the Management API:

```bash
SB=$(security find-generic-password -s "Supabase CLI" -w)   # macOS keychain; or use your own PAT
REF=pvedpfhlzojavgbqhmcu

# Record the current state first — this is your rollback.
curl -s -H "Authorization: Bearer $SB" \
  "https://api.supabase.com/v1/projects/$REF/config/auth" > auth-config-before.json

curl -s -X PATCH -H "Authorization: Bearer $SB" -H "Content-Type: application/json" \
  -d '{
    "disable_signup": true,
    "site_url": "https://admin.shesaconnect.com",
    "uri_allow_list": "https://admin.shesaconnect.com/**,https://shesa-admin-staging.vercel.app/**",
    "password_min_length": 8,
    "password_required_characters": "abcdefghijklmnopqrstuvwxyz:ABCDEFGHIJKLMNOPQRSTUVWXYZ:0123456789"
  }' \
  "https://api.supabase.com/v1/projects/$REF/config/auth"
```

The allow list carries both admin origins deliberately: the custom domain
is what people see, and `NEXT_PUBLIC_ADMIN_APP_URL` in `.env.production`
still points at the Vercel one, so a `redirectTo` can legitimately be
either.

Verify — signup closed, and an invite link that actually goes somewhere:

```bash
curl -s -H "apikey: $ANON" https://$REF.supabase.co/auth/v1/settings | jq .disable_signup
# expect: true

curl -s -X POST -H "apikey: $ANON" -H "Content-Type: application/json" \
  -d '{"email":"probe@example.com","password":"ProbePassw0rd"}' \
  https://$REF.supabase.co/auth/v1/signup
# expect: 422 signup_disabled

# The admin path must still work — generate_link creates the user without
# sending mail. Note `redirect_to` is TOP LEVEL on the REST API; nesting it
# under `options` (the supabase-js convention) is silently ignored.
curl -s -X POST -H "apikey: $SR" -H "Authorization: Bearer $SR" -H "Content-Type: application/json" \
  -d '{"type":"invite","email":"probe@shesaconnect.com","redirect_to":"https://admin.shesaconnect.com/callback"}' \
  https://$REF.supabase.co/auth/v1/admin/generate_link
# expect: 200, and redirect_to echoed back unchanged
```

Delete any probe user afterwards:
`DELETE /auth/v1/admin/users/{id}` with the service-role key.

### 7b. Drop pgtap

`20260902130000_baseline_extensions.sql` skips pgtap when the GUC
`app.environment` is `'production'` — but **that guard cannot fire on a
hosted project.** Supabase's `postgres` role is not a superuser, so both
`ALTER DATABASE postgres SET app.environment` and the `ALTER ROLE … IN
DATABASE` form are refused. pgtap therefore installs, and has to be
removed by hand:

```bash
psql "$SUPABASE_DB_URL" -c "DROP EXTENSION IF EXISTS pgtap CASCADE; DROP SCHEMA IF EXISTS pgtap CASCADE;"
```

### 8. Push migrations to `origin/master` (if not already there)

If any migration files that just ran aren't yet merged into `master`,
push and merge them before anyone else pulls. The reset worked because
your local `supabase/migrations/` includes them — another dev pulling an
older `master` will diverge from the prod schema on their next reset.

## Verify it worked

```bash
# 3 human users, no others
psql "$SUPABASE_DB_URL" -c "SELECT email FROM auth.users ORDER BY email;"

# mainstream 1, branch 5, batch 74, house 4, network 4
psql "$SUPABASE_DB_URL" -c \
  "SELECT scope_type, COUNT(*) FROM core.scopes GROUP BY scope_type ORDER BY scope_type;"

# 6 roles, 70 permissions, 143 bundles, 30 positions
psql "$SUPABASE_DB_URL" -c \
  "SELECT (SELECT COUNT(*) FROM core.roles)            AS roles,
          (SELECT COUNT(*) FROM core.permissions)      AS permissions,
          (SELECT COUNT(*) FROM core.role_permissions) AS bundles,
          (SELECT COUNT(*) FROM core.position_catalog) AS positions;"

# AGM 2026 group + its 7 charges
psql "$SUPABASE_DB_URL" -c \
  "SELECT c.name, c.shape, c.status, c.close_date FROM finance.charges c
     JOIN finance.groups g ON g.id = c.group_id
    WHERE g.slug = 'agm-2026' ORDER BY c.name;"

# Every operational table is empty — including CMS
psql "$SUPABASE_DB_URL" -c \
  "SELECT (SELECT COUNT(*) FROM core.members)       AS members,
          (SELECT COUNT(*) FROM core.memberships)   AS memberships,
          (SELECT COUNT(*) FROM finance.payments)   AS payments,
          (SELECT COUNT(*) FROM finance.expenses)   AS expenses,
          (SELECT COUNT(*) FROM cms.articles)       AS articles,
          (SELECT COUNT(*) FROM cms.gallery_albums) AS albums;"
```

Expected: the counts in "What you end up with", and every operational
count at 0. Every AGM charge closes 2026-11-15 — ticket, attire and all
four funding tiers. They used to close on three different dates; they were
aligned on 2026-09-03.

Then in a browser:

1. `https://admin.shesaconnect.com` → log in as `admin@shesaconnect.com`
   with the seeded password.
2. `https://shesaconnect.com/agm-2026` → all three forms (Registration,
   Attire, Funding) render, and a submission lands in
   `cms.agm_registrations` and **nowhere in finance**. That separation is
   deliberate until a payment provider is wired up.
3. `https://shesaconnect.com/news` → empty. The seed ships no CMS
   content; that is correct, not a failure.

## If it goes wrong

| Symptom                                                            | Cause                                                                                                                                                                         | Fix                                                                                                                                                                                                          |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `permission denied for schema core` on step 5                      | Wrong Supabase account, or `link` targets a project you don't own.                                                                                                            | `supabase logout`, log back in with the right account, re-run `link`.                                                                                                                                        |
| `psql: FATAL: password authentication failed` on step 6            | DB password rotated in Supabase but not in your shell's connection string.                                                                                                    | Rebuild `SUPABASE_DB_URL` with the new password.                                                                                                                                                             |
| `ERROR: relation "finance.groups" does not exist` in the seed      | Migrations didn't finish — likely `--no-seed` was omitted and the CLI aborted partway.                                                                                        | Re-run step 5 with `--no-seed`, then step 6.                                                                                                                                                                 |
| `ERROR: no mainstream scope configured` in the seed                | Section 1 of `seed.sql` didn't insert the mainstream scope; the trigger on `finance.groups` requires it.                                                                      | Check Section 1 ran. This is also the failure the pre-baseline migration chain used to hit.                                                                                                                  |
| Every insert prints `INSERT 0 0`                                   | The seed re-ran on an already-seeded database (idempotency working).                                                                                                          | Safe re-run signal, not a failure. Nothing was clobbered.                                                                                                                                                    |
| `ALTER EXTENSION pgmq ADD SEQUENCE … does not exist` on step 5     | The reset left pgmq's `q_*`/`a_*` tables standing but emptied `pgmq.meta` and dropped their sequences. `pgmq.create()` then skips the table and dies on the missing sequence. | Already handled — `20260902130200_baseline_platform.sql` clears orphaned queue tables before creating. If it recurs, the queue tables are empty by definition; detach them from the extension and drop them. |
| CLI ends with `Failed to read certificate … pgdelta-target-ca.crt` | A post-migration step in the CLI, not the migration.                                                                                                                          | Check `supabase_migrations.schema_migrations` — if every version is recorded, the reset succeeded. It did on 2026-09-03.                                                                                     |
| 160 members appear after seeding                                   | `seed-demo.sql` was run against production.                                                                                                                                   | Reset and start again from step 5. Do not try to delete the demo rows by hand.                                                                                                                               |
| First login says "Invalid email or password"                       | Mistyped, or the password was changed after seeding.                                                                                                                          | Supabase → Auth → Users → the row → Send password reset.                                                                                                                                                     |
| Public AGM form errors with "AGM 2026 is not open yet"             | The charge's `close_date` is in the past for the server's clock.                                                                                                              | Check the server clock. If the deadline really passed, edit `close_date` via Finance → Charges.                                                                                                              |

## Rollback

There is no rollback from a full production reset unless you snapshotted
first. If a snapshot exists:

1. Supabase → Project settings → Database → Backups.
2. Pick the snapshot and Restore.
3. Verify the app still boots.

If no snapshot exists, the reset is the new source of truth.

## After

- **Create the remaining networks and every chapter** in the Admin
  portal. Member import fails on any `network` value that isn't seeded,
  and only four are.
- **Seeded passwords are not rotated automatically.** They are in this
  repo's Git history, which is a known and accepted risk — the decision
  is that each of the three account holders changes their own password if
  they judge it necessary. If that decision changes, rotate all three
  before anyone else logs in.
- **Scrub shell history** of any entry containing the DB URL with its
  password. `history -c && rm ~/.zsh_history` (or your shell's
  equivalent) if you know it leaked.
- **Announce the reset** in the operators' channel — branch admins will
  see zero members and think something broke.
- **Smoke test**: as `admin@`, create one member, one branch, one charge,
  one payment. Delete them after. Confirms the full round-trip.
- **Update the shared vault** with the rotated DB password.
