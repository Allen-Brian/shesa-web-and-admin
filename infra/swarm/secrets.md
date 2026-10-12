# Swarm secrets — provisioning runbook

`docker-compose.prod.yml` references six `external: true` secrets. Each must exist on the swarm BEFORE the first `docker stack deploy`. Run these ONCE per VPS (once for staging, once for production).

## Prerequisites

- SSH into the VPS as the deploy user.
- `docker swarm init` has been run (or the node has joined an existing swarm).

## Create each secret

Each command pipes the value from stdin — no `--data` on the command line where it would land in shell history / `ps` output.

```bash
# Supabase — get from the target project's Settings → API page
printf '%s' 'https://<PROJECT_REF>.supabase.co' | docker secret create supabase_url -
printf '%s' '<ANON_KEY>'                        | docker secret create supabase_anon_key -
printf '%s' '<SERVICE_ROLE_KEY>'                | docker secret create supabase_service_role_key -
printf '%s' 'postgresql://postgres:<DB_PASSWORD>@aws-0-<REGION>.pooler.supabase.com:6543/postgres' \
                                                | docker secret create supabase_db_url -

# Resend — Settings → API Keys
printf '%s' 're_<KEY>'                          | docker secret create resend_api_key -

# Next Server Actions encryption key — MUST be unique per env
# (never reuse across staging and prod).
openssl rand -hex 32                            | docker secret create next_server_actions_encryption_key -
```

## Rotating a secret

Docker Swarm secrets are immutable — you can't `docker secret update`. To rotate:

```bash
# 1. Create the new secret with a versioned name
printf '%s' '<NEW_VALUE>' | docker secret create supabase_service_role_key_v2 -

# 2. Update docker-compose.prod.yml to reference *_v2 in the app services
#    that read the secret, commit, push to the branch that triggers
#    deploy for this env.

# 3. Once the rolling redeploy is healthy, retire the old secret:
docker secret rm supabase_service_role_key
```

Never delete the old secret BEFORE the rolling redeploy completes — any container still using it would fail to restart.

## Auditing what's on the box

```bash
docker secret ls   # lists names, sizes, creation timestamps
```

Values are opaque — `docker secret inspect <name>` shows metadata but not the payload. Only the container that mounts `/run/secrets/<name>` can read it.
