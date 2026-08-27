#!/usr/bin/env bash
set -euo pipefail
umask 027

unset BITRIX24_WEBHOOK_URL TELEGRAM_BOT_TOKEN TELEGRAM_CHAT_ID

environment_file="${ITWHITE_LANDING_ENV_FILE:-/etc/itwhite-landing.env}"
test -r "$environment_file"
set -a
# shellcheck disable=SC1090
source "$environment_file"
set +a

test -n "${LEAD_INGEST_URL:-}"
test -n "${LEAD_INGEST_SECRET:-}"
test -n "${LEAD_IP_HASH_SECRET:-}"

exec /usr/bin/node /var/www/itwhite-landing/current/server/entry.mjs
