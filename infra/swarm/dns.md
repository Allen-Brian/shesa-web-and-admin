# DNS + Cloudflare setup

Run once per environment (staging + production separately).

## 1. Cloudflare zone

Add `shesaconnect.com` as a Cloudflare zone. Both staging and production point at the SAME zone — staging uses `staging-*` sibling hostnames, production uses the apex + subdomain shape. Nameservers on the registrar go to Cloudflare.

## 2. DNS records

### Staging (VPS: `<STAGING_VPS_IPv4>`)

| Type | Name              | Content              | Proxy status |
| ---- | ----------------- | -------------------- | ------------ |
| A    | `staging`         | `<STAGING_VPS_IPv4>` | Proxied      |
| A    | `staging-auth`    | `<STAGING_VPS_IPv4>` | Proxied      |
| A    | `staging-exco`    | `<STAGING_VPS_IPv4>` | Proxied      |
| A    | `staging-finance` | `<STAGING_VPS_IPv4>` | Proxied      |

### Production (VPS: `<PROD_VPS_IPv4>`, added later)

| Type | Name      | Content           | Proxy status |
| ---- | --------- | ----------------- | ------------ |
| A    | `@`       | `<PROD_VPS_IPv4>` | Proxied      |
| A    | `www`     | `<PROD_VPS_IPv4>` | Proxied      |
| A    | `auth`    | `<PROD_VPS_IPv4>` | Proxied      |
| A    | `exco`    | `<PROD_VPS_IPv4>` | Proxied      |
| A    | `finance` | `<PROD_VPS_IPv4>` | Proxied      |

Every entry per env uses the same VPS IP — Caddy fans out to the right container based on the `Host` header.

## 3. Cloudflare TLS mode

Under SSL/TLS → Overview, set to **Full (Strict)**. This means Cloudflare validates the origin cert Caddy issues via Let's Encrypt. Any weaker mode (Flexible, Full-not-strict) either serves user traffic over HTTP between Cloudflare and the origin, or accepts a mismatched cert — both defeat the point of having Caddy do ACME at all.

## 4. Cloudflare page rules / origin cert

You do NOT need a Cloudflare origin cert. Caddy issues its own Let's Encrypt cert; Cloudflare validates it and re-terminates for the user. Two real certs in the chain, both auto-renewing.

## 5. Verification

After the first deploy against a fresh zone (staging shown; substitute the prod host for prod):

```bash
# Cloudflare is in the path (cf-ray header)
curl -sSI https://staging.shesaconnect.com | grep -i cf-ray

# The origin cert is Let's Encrypt (not a Cloudflare cert)
openssl s_client -connect <STAGING_VPS_IPv4>:443 -servername staging.shesaconnect.com 2>/dev/null \
  | openssl x509 -noout -issuer
# Issuer should say "Let's Encrypt" — if it says Cloudflare, TLS mode is wrong.
```

## 6. Known caveat — shared cookie domain across envs

Staging and production both live under `shesaconnect.com`. The auth app scopes its session cookie with `Domain=.shesaconnect.com` so it's readable across sibling hostnames (`staging-auth` → `staging-exco`, etc). Side effect: a browser holding a prod cookie will present it to staging (and vice-versa). Do NOT reuse prod Supabase creds on staging. If cross-env cookie contamination becomes a real problem, options are (a) move staging to a distinct apex, or (b) scope cookies to the immediate host only and drop cross-subdomain SSO on staging.
