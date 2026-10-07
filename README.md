# Loss — link management

Link shortener with custom domains, dynamic QR codes, privacy-first analytics, team workspaces, an API and webhooks.
React 19 + Vite frontend, Vercel serverless API, Firebase Auth + Firestore, PayTR billing.

**Live demo without a backend:** `npm run preview:static` builds a single self-contained HTML file (`dist-preview/preview.html`) in demo mode.

## Product

| Area | What it does |
| --- | --- |
| Links | Custom/random slugs, folders, tags, search, filters, bulk actions, CSV import/export, UTM builder, notes |
| Branding | Custom domains (DNS TXT verification, optional automatic Vercel attach), per-domain slug namespace, social preview cards |
| QR | Dynamic QR (points at the short link), colours/pattern/logo, SVG + PNG, separate scan tracking (`?qr=1`) |
| Routing | 301/302/307, iOS/Android/country targeting, password, expiry, click limit |
| Analytics | Per link and per workspace: time series, country, city, device, browser, OS, referrer, QR vs link, recent activity. Cookieless, no raw IPs |
| Teams | Workspaces, roles (viewer/editor/admin/owner), invite links, audit log |
| Developers | REST API with workspace-bound keys (read-only or read/write), signed webhooks (`link.created/updated/deleted/clicked`) |
| Trust & safety | Destination validation, rate limits, blocklist, optional Google Web Risk scan, public abuse reports + moderator tooling |
| Billing | PayTR checkout, signed idempotent callback, renewals via cron, cancel/resume, order history |
| Privacy | Data export (JSON), account deletion |

Plans (server-enforced, see `server/lib/plans.js`): Free (25 links) · Starter (500, 1 domain) · Pro Team (2 500, 3 domains, 5 seats, API, webhooks, password/expiry/limits/targeting, audit) · Agency (15 000, 15 domains, 25 seats).

## Architecture

```
src/                 React app (own router, i18n TR/EN, design tokens in src/styles)
  pages/marketing    Landing, features, pricing, API docs, legal, abuse report
  pages/app          Dashboard (links, detail, analytics, QR, domains, developers, team, audit, billing, settings)
  lib/demo.js        Browser-only demo backend (same response shapes as the API)
api/[...path].js     Single serverless function → server/router.js
api/redirect/[slug]  The redirect hot path (/:slug is rewritten here)
api/billing/*        PayTR notification URL + renewal cron (fixed paths)
server/lib           Auth, workspaces/roles, plans, URL safety, passwords, rate limits, hosts/domains, webhooks, audit …
server/routes        One module per resource
tests/               node:test suites (in-memory Firestore double) + e2e smoke test
```

Every read and write goes through the API (Admin SDK); `firestore.rules` denies all direct client access. Plan limits, URL validation, password hashing, role checks and click counting are enforced on the server — the UI only reflects `/api/me`.

A user's personal workspace id is their uid, so `links.ownerId` is always the workspace id (uid for personal, `ws_…` for team workspaces).

## Local development

```bash
cp .env.example .env     # Firebase web config for auth; server vars for `vercel dev`
npm ci
npm run dev              # frontend; without Firebase config use “Try the demo”
npm test                 # unit + handler tests
npm run build
```

Run the API locally with `vercel dev` (needs the server-only variables).

## Deploying

1. Set every variable from `.env.example` in Vercel (PayTR and `CRON_SECRET` are required for billing, `SALT_SECRET` for analytics hashing).
2. `firebase deploy --only firestore:rules,firestore:indexes` — the indexes file includes the collection-group index used by workspace analytics.
3. Enable a Firestore **TTL policy** on `rate_limits.expiresAt`.
4. PayTR panel: notification URL `https://<host>/api/billing/paytr-callback`.
5. For automatic TLS on customer domains set `VERCEL_API_TOKEN` + `VERCEL_PROJECT_ID` (otherwise add the domain in Vercel manually after verification).
6. Smoke-test Google sign-in, link creation, a redirect, a custom domain and a test payment. The strict CSP in `vercel.json` must be validated against your Firebase auth domain.
7. Set `VITE_CONTACT_EMAIL` so the legal pages show a contact address, and have counsel review `src/pages/marketing/Legal.jsx` before launch.

## Security model (short)

- Destinations: http(s) only; no embedded credentials, private/loopback hosts, own hosts or other shorteners; re-checked at redirect time.
- Auth: Firebase ID tokens or hashed API keys; roles per workspace; foreign resources answer 404 (no enumeration).
- Passwords: scrypt (legacy SHA-256 still verifies and is upgraded); unlock attempts limited per IP+link and per link.
- Webhooks: https only, public hosts only, HMAC-SHA256 signatures with timestamp.
- Payments: constant-time HMAC verification, server-side order/amount check, idempotent settlement, cron fails closed.
- Analytics: no cookies, no raw IPs — daily-rotating salted hash.

## Known limits

- Click counting uses one Firestore document per link (~1 sustained write/s); a viral link needs sharded counters.
- Analytics reads up to 20 000 click documents per view (UI shows when truncated).
- Webhook delivery is single-attempt (5 s timeout) without a retry queue.
- Team invites are shareable links; no email is sent.
- Server error messages are Turkish only.
