#!/usr/bin/env bash
set -euo pipefail
umask 077

environment_file="${ITWHITE_ADMIN_ENV_FILE:-/etc/itwhite-admin.env}"
backup_root="${ITWHITE_ADMIN_BACKUP_DIR:-/var/backups/itwhite-admin/daily}"
retention_days="${ITWHITE_ADMIN_BACKUP_RETENTION_DAYS:-7}"
quiesce_admin="${ITWHITE_ADMIN_BACKUP_QUIESCE:-true}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
destination="${backup_root}/${timestamp}"
temporary="${backup_root}/.partial-${timestamp}"
admin_was_active=false
worker_was_active=false

test -r "$environment_file"
install -d -m 0700 "$backup_root"
install -d -m 0700 "$temporary"

cleanup_partial() {
  if test -d "$temporary"; then
    find "$temporary" -type f -delete
    find "$temporary" -depth -type d -empty -delete
  fi
  if test "$admin_was_active" = true; then systemctl start itwhite-admin.service; fi
  if test "$worker_was_active" = true; then systemctl start itwhite-lead-worker.service; fi
}
trap cleanup_partial EXIT

if test "$quiesce_admin" = true && systemctl is-active --quiet itwhite-lead-worker.service; then
  systemctl stop itwhite-lead-worker.service
  worker_was_active=true
fi
if test "$quiesce_admin" = true && systemctl is-active --quiet itwhite-admin.service; then
  systemctl stop itwhite-admin.service
  admin_was_active=true
fi

set -a
# shellcheck disable=SC1090
source "$environment_file"
set +a

test -n "${DATABASE_URL:-}"
export ITWHITE_PG_SERVICE_TARGET="$temporary/pg_service.conf"
export ITWHITE_PGPASS_TARGET="$temporary/pgpass"
node -e '
  const fs = require("node:fs")
  const connection = new URL(process.env.DATABASE_URL)
  if (!/^postgres(?:ql)?:$/.test(connection.protocol)) throw new Error("unsupported_database_protocol")
  const fields = [connection.hostname, connection.port || "5432", decodeURIComponent(connection.pathname.slice(1)), decodeURIComponent(connection.username), decodeURIComponent(connection.password)]
  if (fields.some((value) => !value || /[\r\n]/.test(value))) throw new Error("invalid_database_url")
  const pgpassEscape = (value) => value.replace(/\\/g, "\\\\").replace(/:/g, "\\:")
  const serviceEscape = (value) => value.replace(/\\/g, "\\\\").replace(/\x27/g, "\\\x27")
  fs.writeFileSync(process.env.ITWHITE_PG_SERVICE_TARGET, `[itwhite_admin_backup]\nhost=${serviceEscape(fields[0])}\nport=${serviceEscape(fields[1])}\ndbname=${serviceEscape(fields[2])}\nuser=${serviceEscape(fields[3])}\n`, { mode: 0o600 })
  fs.writeFileSync(process.env.ITWHITE_PGPASS_TARGET, `${fields.map(pgpassEscape).join(":")}\n`, { mode: 0o600 })
'
unset DATABASE_URL
PGSERVICEFILE="$ITWHITE_PG_SERVICE_TARGET" PGPASSFILE="$ITWHITE_PGPASS_TARGET" \
  pg_dump --format=custom --no-owner --no-privileges --file "$temporary/database.dump" --dbname=service=itwhite_admin_backup
rm -f "$ITWHITE_PG_SERVICE_TARGET" "$ITWHITE_PGPASS_TARGET"
unset ITWHITE_PG_SERVICE_TARGET ITWHITE_PGPASS_TARGET

for directory in media lead-files; do
  source_path="/var/lib/itwhite-admin/${directory}"
  if test -d "$source_path"; then
    tar --create --gzip --file "$temporary/${directory}.tar.gz" --directory /var/lib/itwhite-admin "$directory"
  fi
done

(
  cd "$temporary"
  sha256sum ./* > SHA256SUMS
  pg_restore --list database.dump > database.contents
)

mv "$temporary" "$destination"
if test "$admin_was_active" = true; then
  systemctl start itwhite-admin.service
  admin_was_active=false
fi
if test "$worker_was_active" = true; then
  systemctl start itwhite-lead-worker.service
  worker_was_active=false
fi
trap - EXIT

find "$backup_root" -mindepth 1 -maxdepth 1 -type d -name '20??????T??????Z' -mtime "+$retention_days" -print0 |
  while IFS= read -r -d '' expired; do
    find "$expired" -type f -delete
    find "$expired" -depth -type d -empty -delete
  done
