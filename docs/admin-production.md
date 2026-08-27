# Admin production

`admin.itwhite.ru` is a separate Payload/Next service. The public Astro site does not query it at runtime.

## Runtime boundaries

- Node binds only to `127.0.0.1:4323`.
- Nginx terminates TLS and applies an additional Basic Auth gate.
- PostgreSQL uses a dedicated non-superuser role and localhost-only database.
- Secrets live in `/etc/itwhite-admin.env`, never in Git or the PM2 dump.
- Media lives in `/var/lib/itwhite-admin/media`, outside atomic releases.
- Lead attachments live in `/var/lib/itwhite-admin/lead-files`, outside atomic releases.
- Releases live in `/var/www/itwhite-admin/releases`; `current` is the active symlink.

The generated bootstrap credentials are stored only in `/root/itwhite-admin-bootstrap.txt` with mode `0600`. Remove `ADMIN_PASSWORD` from the environment file after the initial owner has been seeded.

## Release gate

1. Install dependencies with the committed lockfile.
2. Generate types, run typecheck and build both Astro and Admin.
3. Back up the admin database and active Nginx vhost.
4. Stop `itwhite-lead-worker.service`, then run committed Payload migrations.
5. Build a new standalone release without changing `current`.
6. Smoke-test the release on a private alternate port.
7. Seed the first owner server-side if and only if no users exist.
8. Atomically switch `current`, restart the service, then enable the proxy vhost.
9. Restart the worker only after the new admin health check passes.
10. Verify health, Basic Auth, Payload login, unauthorized REST denial, TLS and noindex headers.

Do not use Postgres schema push in production. Do not expose Payload's first-user page before the server-side seed succeeds. IndexNow is sent only after a public Astro release, never directly from a CMS draft or publish action.

The edge blocks both first-user registration and password-reset routes. Keep password reset closed until a production email adapter is configured; Payload's console email fallback must never become a recovery channel on a public service.

The edge also blocks `/api/lead-ingest` and Payload job-runner endpoints. The public Astro process calls lead intake only over `127.0.0.1:4323` with `LEAD_INGEST_SECRET`. A successful public response means the lead and its delivery job have committed to PostgreSQL; it does not mean Bitrix24 or Telegram has already responded.

Enable exactly one `itwhite-lead-worker.service`. It uses Payload's dedicated `jobs:run` bin runner every ten seconds, processes only the FIFO `lead-delivery` queue with limit 1, and deletes a job only after successful completion. The Next/Payload web process deliberately has no `autoRun`, preventing two runners from racing. Provider credentials belong to the admin and worker environment and must be absent from the public PM2 process.

The Astro PM2 process starts through `/usr/local/sbin/itwhite-landing-start`, sourced from `ops/pm2/itwhite-landing-start.sh`. The wrapper clears all provider variables, reads only the loopback intake settings from root-only `/etc/itwhite-landing.env`, and starts the active `current` release. Start or recreate that PM2 app with a minimal client environment so neither provider nor intake secrets are serialized into the PM2 dump.

Keep `LEAD_ATTACHMENT_DELIVERY_ENABLED=false` until a production malware scanner is installed. Files are stored in the protected lead-files collection and forced to download as attachments; the Telegram notification only reports that a file is waiting in the admin workspace.

## Lead intake release gate

1. Keep the worker disabled while applying the additive migration.
2. Verify an authenticated loopback intake creates exactly one lead and one job.
3. Repeat the same `submissionId` and confirm no second lead or job appears.
4. Verify public REST create/read remains denied without a Payload session.
5. Enable the single systemd worker and run one labelled end-to-end test.
6. Confirm channel IDs and delivery status were persisted before removing the test lead.

Never fall back to provider delivery without storage in production. If PostgreSQL or intake is unavailable, return `503` and show `info@itwhite.ru`.

## Backups

Install `ops/backup/itwhite-admin-backup.sh` as `/usr/local/sbin/itwhite-admin-backup` and enable `itwhite-admin-backup.timer`. Each root-only backup contains a custom-format PostgreSQL dump, media archives, a dump catalog and SHA-256 manifest. The default local retention is seven days to stay inside the current disk budget.

Before every schema migration, run the backup service manually and validate `SHA256SUMS`, `pg_restore --list`, and both media archives. Test a restore in a separate temporary database. Once real leads exist, never overwrite the live database with an old full dump; restore separately and reconcile or fix forward.

The local backup briefly stops both the lead worker and admin service by default so the database dump and protected file archives describe one quiescent application state. Admin restarts before the worker. During that short window public lead intake fails closed with `503`; the form preserves its `submissionId` for a safe retry. Set `ITWHITE_ADMIN_BACKUP_QUIESCE=false` only for an explicitly coordinated snapshot-capable storage setup.

The durable-lead migration is deliberately fix-forward only: its `down` function refuses to remove lead, file, or delivery history. Application rollback remains possible because the schema change is additive. Database recovery must use an isolated restore followed by a reviewed switchover.

Nginx consumes the outer Basic Auth header and must clear `Authorization` before proxying to Payload, otherwise it masks Payload's cookie authentication. The proxy also enforces `Secure`, `HttpOnly`, and `SameSite=Strict` on upstream cookies.

## Standalone artifact

Copy the contents of `apps/admin/.next/standalone/` to the release root without flattening the monorepo tree. Then copy `apps/admin/.next/static/` to `<release>/apps/admin/.next/static/`. The systemd unit starts `<release>/apps/admin/server.js`.

Rollback is an atomic `current` symlink switch followed by `systemctl restart itwhite-admin`. If a migration is not backwards compatible, restore the pre-migration dump into an isolated database and switch the database only after validation.
