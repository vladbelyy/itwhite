# Admin production

`admin.itwhite.ru` is a separate Payload/Next service. The public Astro site does not query it at runtime.

## Runtime boundaries

- Node binds only to `127.0.0.1:4323`.
- Nginx terminates TLS and applies an additional Basic Auth gate.
- PostgreSQL uses a dedicated non-superuser role and localhost-only database.
- Secrets live in `/etc/itwhite-admin.env`, never in Git or the PM2 dump.
- Media lives in `/var/lib/itwhite-admin/media`, outside atomic releases.
- Releases live in `/var/www/itwhite-admin/releases`; `current` is the active symlink.

The generated bootstrap credentials are stored only in `/root/itwhite-admin-bootstrap.txt` with mode `0600`. Remove `ADMIN_PASSWORD` from the environment file after the initial owner has been seeded.

## Release gate

1. Install dependencies with the committed lockfile.
2. Generate types, run typecheck and build both Astro and Admin.
3. Back up the admin database and active Nginx vhost.
4. Run committed Payload migrations.
5. Build a new standalone release without changing `current`.
6. Smoke-test the release on a private alternate port.
7. Seed the first owner server-side if and only if no users exist.
8. Atomically switch `current`, restart the service, then enable the proxy vhost.
9. Verify health, Basic Auth, Payload login, unauthorized REST denial, TLS and noindex headers.

Do not use Postgres schema push in production. Do not expose Payload's first-user page before the server-side seed succeeds. IndexNow is sent only after a public Astro release, never directly from a CMS draft or publish action.

## Standalone artifact

Copy the contents of `apps/admin/.next/standalone/` to the release root. Then copy `apps/admin/.next/static/` to `<release>/.next/static/`. The systemd unit starts `<release>/server.js`.

Rollback is an atomic `current` symlink switch followed by `systemctl restart itwhite-admin`. If a migration is not backwards compatible, restore the pre-migration dump into an isolated database and switch the database only after validation.
