# ClaimLens

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[繁體中文](README.md) | **English**

**Check claims. Follow the evidence.**

ClaimLens helps readers examine statements from text or article URLs. It separates checkable claims, searches for supporting and conflicting sources, and presents an evidence report with source links.

The application interface and generated reports currently use Traditional Chinese. This is the English project documentation.

## Features

- Text and URL input, with up to four claims and four evidence items per claim.
- Evidence statuses: supported, contradicted, misleading, outdated, unverified, and opinion.
- Server-side analysis using the OpenAI Responses API, web search, and structured JSON output.
- A built-in fictional demo that runs without calling the analysis API.
- URL result caching for 24 hours and a limit of 20 analysis requests per IP per day, based on Asia/Taipei dates. Cache hits also count toward the quota.
- The 12 most recent reports stored in browser localStorage.
- An admin console for saved reports and encrypted API-key management.
- Cloudflare Access JWT verification and optional signed client-IP forwarding through a proxy.

Reports and scores are automated reading aids, not verified truth judgments. Review original sources before relying on a result. Demo sources are illustrative, not real citations.

## Repository layout

| Path | Purpose |
| --- | --- |
| `dist/client/` | Current static frontend: HTML, CSS, and readable JavaScript |
| `server/` | Worker request handler, admin endpoints, authentication, and client-IP handling |
| `dist/server/` | Tracked copy of the Worker modules |
| `dist/index.html`, `dist/app.js`, `dist/styles.css` | An earlier frontend snapshot |
| `db/schema.ts` | Drizzle schema definitions |
| `drizzle/` | SQL migrations and schema metadata |
| `cloudflare-proxy/worker.js` | Optional reverse proxy with signed client-IP forwarding |
| `.openai/hosting.json` | Existing hosted-project metadata; not a portable deployment configuration |

This repository contains deployment snapshots and readable runtime modules. It does not currently include a package.json, lockfile, automated test suite, or original frontend build pipeline. There is no `npm install` / `npm run build` workflow to assume.

## Preview the frontend

With Python 3 installed, run from the repository root:

```bash
python -m http.server 8000 --bind 127.0.0.1 --directory dist/client
```

On Windows, `py` may be used instead of `python`.

Open [http://localhost:8000](http://localhost:8000) and select the demo example, then start analysis. The built-in example runs entirely in the browser. A static preview cannot process other inputs because it has no `/api/analyze` backend.

The page loads fonts from Google Fonts when available.

## Backend deployment requirements

The backend is a module Worker exporting a `fetch(request, env)` handler. It requires a Cloudflare Workers-compatible runtime and a D1 database bound as `DB`; it is not a Node.js HTTP server.

For an independent deployment, provide your own Wrangler configuration, static asset binding `ASSETS` pointing to `dist/client/`, D1 database, secrets, and authentication configuration. Route `/api/*` and `/admin` to the Worker.

Apply the SQL files to a new database in order:

1. `drizzle/0000_sweet_post.sql`
2. `drizzle/0001_abnormal_marvel_zombies.sql`

The migrations create quota, cache, report, and encrypted-key tables. Do not rerun them blindly against an existing database.

The current implementation selects `gpt-5.6-luna` in `server/index.js`. Model access depends on the deployment's API account. Keep source and deployed copies synchronized if changing the model or server behavior.

See the official [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/) and [D1 command reference](https://developers.cloudflare.com/d1/wrangler-commands/) for platform setup. The existing hosted project is not automatically available to forks.

### Environment bindings

| Binding | Purpose |
| --- | --- |
| `DB` | D1 database used by analysis and admin features |
| `ASSETS` | Static assets served by the Worker |
| `OPENAI_API_KEY` | Fallback analysis key, supplied as a server-side secret |
| `ADMIN_ENCRYPTION_KEY` | Base64url-encoded 32-byte key for AES-GCM encryption of admin-managed API keys |
| `CF_ACCESS_TEAM_DOMAIN` | Cloudflare Access issuer origin, such as `https://your-team.cloudflareaccess.com` |
| `CF_ACCESS_AUD` | Expected Access application audience |
| `CF_ACCESS_ADMIN_EMAIL` | Allowed administrator email |
| `PUBLIC_ORIGIN` | Public site origin used for admin mutation origin checks in Access mode |
| `ADMIN_OWNER_ID` | Alternative hosted-platform owner identity; requires a trusted platform to supply `oai-authenticated-user-id` |
| `PROXY_SHARED_SECRET` | Optional shared secret for the proxy's signed client-IP headers |

Store real keys only in your deployment's secret store or ignored local environment files. Do not put them in frontend JavaScript, URLs, documentation, or Git.

Prefer verified Cloudflare Access for an independent deployment. The owner-header alternative depends on a trusted hosting boundary; accepting a client-supplied identity header on an ordinary public server does not establish an administrator's identity.

The optional proxy currently has a hard-coded upstream in `cloudflare-proxy/worker.js`. A fork must replace it with its own backend and configure the same proxy secret on both sides.

## API overview

| Endpoint | Behavior |
| --- | --- |
| `POST /api/analyze` | JSON body `{"input":"text or URL"}`; minimum eight characters |
| `GET /api/health` | Reports service status and whether the environment key and DB binding are present |
| `GET /admin` | Authenticated administrator interface |
| `GET /api/admin/reports` | Paginated saved reports |
| `GET /api/admin/reports/{id}` | Saved report detail |
| `DELETE /api/admin/reports/{id}` | Delete a saved report |
| `GET /api/admin/keys` | Key metadata, without plaintext key values |
| `POST /api/admin/keys` | Store an encrypted analysis key |
| `POST /api/admin/keys/{id}/activate` | Select the active key; `default` selects the environment key |
| `DELETE /api/admin/keys/{id}` | Delete an admin-managed key |

Admin routes require authorization. Non-GET admin requests also require a matching Origin header. An encrypted active key in D1 takes precedence over `OPENAI_API_KEY`; the health endpoint's `configured` flag only checks the environment key.

## Data handling and limitations

- Real analysis sends the submitted input to OpenAI and uses web search. Do not submit confidential material without considering this data flow.
- URL caches contain the normalized input URL and report JSON. Saved reports may contain submitted claims and evidence excerpts.
- Admin report listings exclude reports older than 30 days; physical cleanup happens when another report is saved.
- Rate limiting stores SHA-256 hashes of client IPs and daily usage counts. Hashes are persistent identifiers, not a guarantee of anonymity.
- Local history and theme settings remain in browser localStorage. A copied report URL refers to a local history ID; it does not publish a report another device can retrieve.
- Source links are filtered against URLs returned by the search response, but this is not a guarantee of evidence accuracy or completeness.
- The displayed score averages fixed status weights: supported 100, misleading 35, outdated 25, unverified 20, contradicted 0. Opinions are excluded. It is not a calibrated probability of truth.
- No automated tests or reproducible dependency lockfile are currently included.

## Contributing

Bug reports, documentation improvements, and pull requests are welcome. See [CONTRIBUTING.en.md](CONTRIBUTING.en.md).

## License

Original project code and documentation are available under the [MIT License](LICENSE), copyright © 2026 steventeng2022. Keep the copyright and license notices when redistributing.

Third-party libraries, fonts, services, and linked evidence retain their own licenses and terms. MIT licensing does not grant access to hosted databases, API accounts, production secrets, or rights to third-party articles and research.
