# Own-domain architecture

For this project, the clean setup is to use one domain that you own. Customers do not need to connect their own domains.

## Recommended domain layout

Use separate subdomains so the dashboard and redirect traffic do not compete:

- `app.consolaktif.com.tr` for the Vite dashboard
- `go.consolaktif.com.tr/abc` for short links
- `api.consolaktif.com.tr` for the redirect/link API

Recommended deployment:

- Deploy the Vite build to Firebase Hosting, Vercel, or Cloudflare Pages.
- Add the domain in that provider's dashboard.
- Add the DNS records the provider gives you.
- Keep Firebase Auth `authorizedDomain` and the deployed app domain in sync.

The redirect flow is:

```text
DNS CNAME go.consolaktif.com.tr -> api.consolaktif.com.tr
          |
          v
HTTPS redirect API reads host + slug
          |
          v
Firestore links/{linkId} -> destination URL
```

The Vite app cannot safely perform this redirect or DNS verification. The redirect API needs to:

1. Receive a slug and destination URL from an authenticated user.
2. Save the link under the user's Firestore record.
3. Serve `GET /:slug` on `go.consolaktif.com.tr`.
4. Create a click event before redirecting to the destination.

Suggested domain document:

```json
{
  "ownerId": "firebase-user-id",
  "hostname": "go.consolaktif.com.tr",
  "status": "active",
  "createdAt": "server-timestamp",
  "verifiedAt": null
}
```

Suggested link document:

```json
{
  "ownerId": "firebase-user-id",
  "domainId": "domain-document-id",
  "slug": "summer",
  "destination": "https://example.com/campaign",
  "status": "active",
  "createdAt": "server-timestamp",
  "clickCount": 0
}
```

## DNS records

At your DNS provider, add records similar to these:

```text
  app       CNAME   your-hosting-provider.example
  go        CNAME   api.consolaktif.com.tr
  api       CNAME   your-backend-host.example
```

The exact target values depend on whether the app/API is deployed to Firebase Hosting, Cloud Run, Vercel, or another provider. Do not copy these example targets literally.

## Required environment values

The Vite frontend only gets public Firebase Web App values. Never place Firebase Admin credentials, DNS provider API tokens, or service-account JSON in `.env.local`.

```text
VITE_APP_URL=https://app.consolaktif.com.tr
VITE_SHORTENER_API_URL=https://api.consolaktif.com.tr
```

The backend owns Firebase Admin credentials. Cloud Run, Firebase Functions, or a small Node service are suitable options. Since this is your own domain, no Cloudflare DNS API integration is required for the first version; you can add the DNS records manually once.
