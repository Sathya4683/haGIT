#!/usr/bin/env bash
# Deploys infra/observability to the host created by this Terraform module.
#
#   ./deploy.sh            first run generates secrets into infra/observability/.env (git-ignored),
#                          later runs reuse them; config is synced and the stack (re)started
#
# Prints the values the app needs on Vercel (LOKI_*, METRICS_TOKEN, CRON_SECRET, GRAFANA_URL).
set -euo pipefail

cd "$(dirname "$0")"
STACK_DIR="../observability"
ENV_FILE="$STACK_DIR/.env"
HOST="$(terraform output -raw public_ip)"
DOMAIN="$(terraform output -raw domain)"
SSH=(ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10 "ubuntu@$HOST")
rand() { openssl rand -hex "${1:-24}"; }
setvar() { # setvar KEY VALUE — replace or append in $ENV_FILE
  if grep -q "^$1=" "$ENV_FILE"; then sed -i "s|^$1=.*|$1=$2|" "$ENV_FILE"; else echo "$1=$2" >> "$ENV_FILE"; fi
}

if [ ! -f "$ENV_FILE" ]; then
  echo "Generating $ENV_FILE"
  cat > "$ENV_FILE" <<ENV
COMPOSE_PROFILES=observability,edge,cron
DOMAIN=$DOMAIN
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=$(rand 12)
GRAFANA_ROOT_URL=https://$DOMAIN
PROMETHEUS_CONFIG=prometheus.prod.yml
METRICS_TOKEN=$(rand 24)
LOKI_PUSH_USER=hagit
# Plaintext for the app's LOKI_PASSWORD; Caddy only reads the hash below.
LOKI_PUSH_PASSWORD=$(rand 24)
LOKI_PUSH_HASH=''
ALERT_EMAIL=${ALERT_EMAIL:-}
NTFY_ALERT_URL=https://ntfy.sh/hagit-alerts-$(rand 8)
GF_SMTP_ENABLED=false
GF_SMTP_HOST=smtp.gmail.com:587
GF_SMTP_USER=
GF_SMTP_PASSWORD=
GF_SMTP_FROM_ADDRESS=
GF_SMTP_STARTTLS_POLICY=MandatoryStartTLS
ENV
  chmod 600 "$ENV_FILE"
fi
setvar DOMAIN "$DOMAIN"
setvar GRAFANA_ROOT_URL "https://$DOMAIN"
setvar COMPOSE_PROFILES "observability,edge,cron"
grep -q "^CRON_SECRET=." "$ENV_FILE" || setvar CRON_SECRET "$(rand 24)"
grep -q "^TICK_URL=." "$ENV_FILE" || setvar TICK_URL "https://hagithub.vercel.app/api/jobs/tick"

echo "Waiting for $HOST to finish first-boot setup…"
for _ in $(seq 1 60); do
  if "${SSH[@]}" 'test -f /var/lib/cloud/instance/hagit-ready && docker info >/dev/null 2>&1' 2>/dev/null; then break; fi
  sleep 10
done
"${SSH[@]}" 'test -f /var/lib/cloud/instance/hagit-ready' || { echo "Host not ready"; exit 1; }

if ! grep -q "^LOKI_PUSH_HASH='\$2" "$ENV_FILE"; then
  password="$(grep '^LOKI_PUSH_PASSWORD=' "$ENV_FILE" | cut -d= -f2-)"
  hash="$("${SSH[@]}" "docker run --rm caddy:2.9-alpine caddy hash-password --plaintext '$password'")"
  setvar LOKI_PUSH_HASH "'$hash'"
fi

rsync -az --delete --exclude ".env" -e "ssh -o StrictHostKeyChecking=accept-new" "$STACK_DIR/" "ubuntu@$HOST:hagit-observability/"
scp -q -o StrictHostKeyChecking=accept-new "$ENV_FILE" "ubuntu@$HOST:hagit-observability/.env"
"${SSH[@]}" 'cd hagit-observability && chmod 600 .env && docker compose pull --quiet && docker compose up -d --remove-orphans && docker compose ps --format "table {{.Name}}\t{{.Status}}"'

get() { grep "^$1=" "$ENV_FILE" | cut -d= -f2-; }
cat <<OUT

Grafana:   https://$DOMAIN   (user: admin, password: $(get GRAFANA_ADMIN_PASSWORD))
Alerts:    subscribe to $(get NTFY_ALERT_URL) in the ntfy app

Set on Vercel (Production) and redeploy:
  LOKI_URL=https://$DOMAIN/loki/api/v1/push
  LOKI_USERNAME=hagit
  LOKI_PASSWORD=$(get LOKI_PUSH_PASSWORD)
  METRICS_TOKEN=$(get METRICS_TOKEN)
  CRON_SECRET=$(get CRON_SECRET)
  GRAFANA_URL=https://$DOMAIN
OUT
