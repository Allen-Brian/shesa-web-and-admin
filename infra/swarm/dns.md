# DNS + Cloudflare setup

Run once per environment (staging + production separately).

## 1. Cloudflare zone

Add the apex domain (`shesa.org` for production, `staging.shesa.org` — or a separate apex — for staging) as a Cloudflare zone. Point the nameservers at Cloudflare from the registrar.

## 2. DNS records

For the production apex `shesa.org` (repeat with the staging apex):

| Type | Name      | Content            | Proxy status |
| ---- | --------- | ------------------ | ------------ |
| A    | `@`       | `<VPS_IPv4>`       | Proxied      |
| AAAA | `@`       | `<VPS_IPv6>` (opt) | Proxied      |
| A    | `www`     | `<VPS_IPv4>`       | Proxied      |
| A    | `auth`    | `<VPS_IPv4>`       | Proxied      |
| A    | `exco`    | `<VPS_IPv4>`       | Proxied      |
| A    | `finance` | `<VPS_IPv4>`       | Proxied      |

Every entry uses the same VPS IP — Caddy fans out to the right container based on the `Host` header.

## 3. Cloudflare TLS mode

Under SSL/TLS → Overview, set to **Full (Strict)**. This means Cloudflare validates the origin cert Caddy issues via Let's Encrypt. Any weaker mode (Flexible, Full-not-strict) either serves user traffic over HTTP between Cloudflare and the origin, or accepts a mismatched cert — both defeat the point of having Caddy do ACME at all.

## 4. Cloudflare page rules / origin cert

You do NOT need a Cloudflare origin cert. Caddy issues its own Let's Encrypt cert; Cloudflare validates it and re-terminates for the user. Two real certs in the chain, both auto-renewing.

## 5. Verification

After the first deploy against a fresh zone:

```bash
# Cloudflare is in the path (cf-ray header)
curl -sSI https://shesa.org | grep -i cf-ray

# The origin cert is Let's Encrypt (not a Cloudflare cert)
openssl s_client -connect <VPS_IPv4>:443 -servername shesa.org 2>/dev/null \
  | openssl x509 -noout -issuer
# Issuer should say "Let's Encrypt" — if it says Cloudflare, TLS mode is wrong.
```
