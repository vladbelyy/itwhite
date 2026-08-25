# IT WHITE Admin

Private Payload CMS 3 application for leads, cases, insights, sources, and media.

## Security model

- `owner`: user and role management, all content, leads.
- `admin`: operational administration, content, leads; cannot grant roles or delete users.
- `editor`: content, sources, and media; no lead PII.
- `sales`: leads only; no editorial content.
- Collection APIs are default-deny for unauthenticated callers.
- GraphQL is disabled. CORS and CSRF accept only the configured admin origin.
- Uploads are authenticated, image-only, URL paste is disabled, and request size is capped at 10 MB.

## Local development

1. Copy `.env.example` to `.env` and replace every `CHANGE_ME` value.
2. Create a dedicated PostgreSQL database.
3. From the repository root run `pnpm install`.
4. Run `pnpm --filter @itwhite/admin generate:types` and `pnpm --filter @itwhite/admin dev`.

Do not use the public create-first-user flow. Before exposing the application, seed the first owner from trusted server-side environment variables:

```sh
pnpm --filter @itwhite/admin seed:owner
```

The command exits when required variables are absent, refuses short passwords, and refuses to create or elevate an owner when another user already exists.

## Production

- Bind the Node process to `127.0.0.1:4323` and proxy it through TLS at `https://admin.itwhite.ru`.
- Keep the environment file outside the release directory with mode `0600`.
- Set `MEDIA_DIR=/var/lib/itwhite-admin/media`; keep that directory outside atomic releases and include it in backups.
- Set `DATABASE_POOL_MAX=3` unless the PostgreSQL connection budget is deliberately changed.
- Run migrations before swapping the release: `pnpm --filter @itwhite/admin payload migrate`.
- Build with `pnpm --filter @itwhite/admin build`.
- The monorepo standalone runtime entrypoint is `.next/standalone/apps/admin/server.js`. Preserve the complete standalone tree and copy `.next/static` into `.next/standalone/apps/admin/.next/static` when preparing the release.
- Verify `GET /api/health` returns only `{"status":"ok"}` before routing traffic.
