# Runbook: reset the production database + apply migrations + seed

## What this is

The end-to-end procedure for wiping the production Supabase database,
re-applying every migration, and loading `supabase/prod-seed.sql`. Use
this when standing up a fresh production environment or when a
controlled full reset is intentional. This does NOT cover partial
migrations or backup/restore — see the platform provider's docs for
those.

**Consequences of running this:** every row in every table is deleted.
Every user vanishes. Every finance record, member, invitation, and
piece of CMS content — gone. There is no rollback without a backup.

## When you need it

- Very first prod stand-up (nothing to lose).
- A staging-to-prod cutover where the prod database was a placeholder.
- A deliberate, announced full reset (a maintenance window with users
  informed in advance).

Never for "the app is misbehaving." That's a Supabase support ticket.

## Prerequisites

- **Supabase CLI ≥ 2.100** (this repo pins one via
  `node_modules/.bin/supabase`; run it via `pnpm exec supabase …`).
- **Access token** for the Supabase account that owns the project:
  create one under Account → Access Tokens on supabase.com.
- **Project ref** for the prod project (looks like `pvedpfhlzojavgbqhmcu` —
  visible in the project URL).
- **DB password** for the prod project's Postgres role. Rotate it now
  if it's older than your last audit or if it has ever been pasted into
  chat (see the "Rotate the DB password" step below).
- **Local shell** at the repo root — this runbook uses relative paths
  from there.
- **Backup** if there's anything worth keeping. Full reset is
  irreversible without one.

## Steps

### 1. Rotate the DB password (do this first)

If the current password has been shared in a chat log, PR, or ticket,
rotate it now. In Supabase → Project settings → Database → Reset
database password. Use an alphanumeric-only replacement — special
characters like `$` require URL-encoding in the connection string and
tend to break shells that don't quote it consistently.

Update the new password in every env store that references it:

- Vercel: `admin-prod` + `web-prod` projects → Environment Variables →
  `SUPABASE_DB_URL` (rebuild the URL with the new password).
- GitHub Actions repo secrets → same variable name.
- Your local `.env.production` (if you keep one — it should not be
  committed).

### 2. Log the CLI into the Supabase account

```bash
pnpm exec supabase login
```

Paste the access token when prompted. This writes `~/.supabase/access-token`
and is persistent across runs — you don't need to repeat it every
reset.

### 3. Link this repo to the prod project

```bash
pnpm exec supabase link --project-ref <prod-project-ref>
```

Confirm it prompted for the DB password (the newly rotated one). The
CLI stores the project ref under `supabase/.temp/` — check it in with:

```bash
cat supabase/.temp/project-ref
```

If it prints the wrong ref, re-run `link` with the right one.

### 4. Reset the prod database and run every migration

```bash
pnpm exec supabase db reset --linked --no-seed
```

- `--linked` targets the remote project you just linked.
- `--no-seed` stops the CLI from running the dev `supabase/seed.sql`.

The CLI will:

1. Prompt you to confirm the destructive action — read the project ref
   in the prompt out loud before typing `y`. Wrong project = disaster.
2. Drop and recreate the `public`, `core`, `finance`, `cms`, `notifications`,
   `exco`, `audit`, and `auth` schemas.
3. Replay every file in `supabase/migrations/` in order.

Expected output ends with a line like `Finished supabase db reset`.

### 5. Load the production seed

```bash
psql "$SUPABASE_DB_URL" -f supabase/prod-seed.sql
```

Where `SUPABASE_DB_URL` is the connection string from step 1
(rebuilt with the rotated password). Get it from
Supabase → Project settings → Database → Connection string → URI, then
paste the password into the `[YOUR-PASSWORD]` placeholder.

Expected output: a mostly-quiet run with a handful of `INSERT 0 N`
lines. Any `ERROR:` line is a real failure — read it before doing
anything else.

### 6. Push migrations to `origin/master` (if not already there)

If any migration files that just ran aren't yet merged into `master`,
push and merge them before anyone else pulls the repo. The reset
worked because your local `supabase/migrations/` includes them —
another dev pulling an older `master` will diverge from the prod
schema next time they `db reset` their local env.

## Verify it worked

Run these one-liners against the prod database:

```bash
# 3 human users, no others
psql "$SUPABASE_DB_URL" -c \
  "SELECT email FROM auth.users ORDER BY email;"

# 74 batches (1953..2026), 4 houses, 1 mainstream = 79 scopes
psql "$SUPABASE_DB_URL" -c \
  "SELECT scope_type, COUNT(*) FROM core.scopes GROUP BY scope_type ORDER BY scope_type;"

# AGM 2026 group + its 7 charges
psql "$SUPABASE_DB_URL" -c \
  "SELECT c.name, c.shape, c.status FROM finance.charges c
    JOIN finance.groups g ON g.id = c.group_id
   WHERE g.slug = 'agm-2026' ORDER BY c.name;"

# Every other operational table is empty
psql "$SUPABASE_DB_URL" -c \
  "SELECT
     (SELECT COUNT(*) FROM core.members)                AS members,
     (SELECT COUNT(*) FROM core.memberships)            AS memberships,
     (SELECT COUNT(*) FROM finance.payments)            AS payments,
     (SELECT COUNT(*) FROM finance.expenses)            AS expenses;"
```

Expected:

- 3 emails: `admin@`, `finance@`, `editor@shesaconnect.com`.
- Scopes: `mainstream = 1`, `house = 4`, `batch = 74`.
- Group: `AGM 2026`, `Attire`, `Bronze Funding`, `Gold Funding`,
  `Platinum Funding`, `Silver Funding`, `Ticket`.
- All operational counts = 0.

Then in a browser:

1. Open `https://admin.shesaconnect.com` (or the appropriate admin
   URL) → log in as `admin@shesaconnect.com` with the seed password.
2. Immediately go to Account → Change password. Change it. Do the
   same for `finance@` and `editor@`.
3. Open `https://shesaconnect.com/agm-2026` and confirm all three
   forms (Registration, Attire, Funding) render without a "not open
   yet" error.

## If it goes wrong

| Symptom                                                       | Cause                                                                                                                                | Fix                                                                                                                                        |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `permission denied for schema core` on step 4                 | You logged into the wrong Supabase account, or `link` targets a project you're not an owner on.                                      | Log out (`supabase logout`), log back in with the correct account, re-run `link`.                                                          |
| `psql: FATAL: password authentication failed` on step 5       | You updated the DB password in Supabase but not in your local shell's connection string.                                             | Rebuild `SUPABASE_DB_URL` with the new password and try again.                                                                             |
| `ERROR: relation "finance.groups" does not exist` in the seed | The migration that creates `finance.groups` didn't run — likely because `--no-seed` was omitted and the CLI aborted on the dev seed. | Re-run step 4 with `--no-seed`, then step 5.                                                                                               |
| `ERROR: no mainstream scope configured` in the seed           | The seed's Section 5 runs before Section 1 for some reason (edit ordering error).                                                    | Check that Section 1 of `prod-seed.sql` inserted the mainstream scope — the trigger on `finance.groups` requires it.                       |
| Every insert prints `INSERT 0 0`                              | The seed re-ran on an already-seeded prod (idempotency working as intended).                                                         | This is the safe re-run signal, not a failure. Data was not clobbered.                                                                     |
| First login says "Invalid email or password"                  | You mistyped the password OR you already rotated the seeded password without noting it down.                                         | Reset it via Supabase Auth (Users → the row → Send password reset).                                                                        |
| Public AGM form errors with "AGM 2026 is not open yet"        | The charge's `close_date` is in the past for the current server time.                                                                | Confirm your prod server clock is correct. If the deadline has genuinely passed, edit the row's `close_date` via Finance → Charges → Edit. |

## Rollback

There is no rollback from a full production reset unless you snapshotted
first. If a snapshot exists:

1. Supabase → Project settings → Database → Backups.
2. Pick the snapshot and click Restore.
3. Verify the app still boots.

If no snapshot exists, the reset is the new source of truth. Move
forward.

## After

- **Rotate every seeded password** for the three human users. Do it
  before anyone else logs in. The seed's passwords are in this repo's
  Git history and any session log that generated them.
- **Delete or scrub** any shell history entry that contains the DB URL
  with password in it. `history -c && rm ~/.zsh_history` (or equivalent
  for your shell) if you know it's leaked.
- **Announce the reset** in the operators' channel (Slack / WhatsApp) —
  branch admins will see zero members and think something broke.
- **Post-reset smoke test**: create one test member as `admin@`, one
  test branch, one test charge, one test payment. Delete them after.
  Confirms the full round-trip works.
- **Update `.env.production.local`** in the developers' shared vault
  with the rotated DB password if you use one.
