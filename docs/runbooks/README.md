# Runbooks

Step-by-step procedures for ops, deploys, and incident response. Written so you can follow them at 2 am when something is on fire.

## Contents

- **[local-dev-setup.md](local-dev-setup.md)** — fresh-machine to running stack: prereqs, `/etc/hosts`, first-time Supabase pull, daily workflow, troubleshooting. Run `pnpm dev:open` after `pnpm db:start` to open every live URL in your browser.

Pending (added as their epic ships):

- **deploy-to-staging.md** — pushing a Docker image to the staging Contabo VPS via Docker Swarm. Lands with E14.
- **deploy-to-production.md** — promoting a staging image to production. Lands with E14.
- **rollback.md** — reverting a bad deploy. Lands with E14.
- **supabase-migration.md** — applying a database migration safely against staging/prod. Lands with E13 (CI auto-apply).

## Writing a runbook

1. Copy [`_template.md`](_template.md).
2. Number every step. Make commands copy-pasteable. Show expected output.
3. Include the symptoms that lead someone here, and the rollback if it goes wrong.
4. Test it on a clean environment before merging — an untested runbook is a footgun.

## Updating

After every incident, update the relevant runbook with what you learned. If no runbook covers what just happened, write one.
