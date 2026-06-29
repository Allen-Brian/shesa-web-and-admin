# Runbooks

Step-by-step procedures for ops, deploys, and incident response. Written so you can follow them at 2 am when something is on fire.

## Contents

_(Populated as runbooks are written. The first ones will land alongside the Phase 0 infrastructure work.)_

Expected initial runbooks:

- **deploy-to-staging.md** — pushing a Docker image to the staging Contabo VPS via Docker Swarm.
- **deploy-to-production.md** — promoting a staging image to production.
- **rollback.md** — reverting a bad deploy.
- **supabase-migration.md** — applying a database migration safely.

## Writing a runbook

1. Copy [`_template.md`](_template.md).
2. Number every step. Make commands copy-pasteable. Show expected output.
3. Include the symptoms that lead someone here, and the rollback if it goes wrong.
4. Test it on a clean environment before merging — an untested runbook is a footgun.

## Updating

After every incident, update the relevant runbook with what you learned. If no runbook covers what just happened, write one.
