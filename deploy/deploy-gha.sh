#!/usr/bin/env bash
set -euo pipefail

: "${SSH_HOST:?SSH_HOST manquant}"
: "${SSH_USER:?SSH_USER manquant}"
: "${SSH_PORT:=22}"
: "${APP_ROOT:?APP_ROOT manquant}"
: "${SERVICE_NAME:?SERVICE_NAME manquant}"
: "${LISTEN_PORT:?LISTEN_PORT manquant}"
: "${HEALTH_URL:?HEALTH_URL manquant}"

SSH_OPTS=(-p "$SSH_PORT" -o StrictHostKeyChecking=yes -o IdentitiesOnly=yes)
SCP_OPTS=(-P "$SSH_PORT" -o StrictHostKeyChecking=yes -o IdentitiesOnly=yes)
if [ -n "${SSH_KEY_PATH:-}" ]; then
  SSH_OPTS+=(-i "$SSH_KEY_PATH")
  SCP_OPTS+=(-i "$SSH_KEY_PATH")
fi

remote() { ssh "${SSH_OPTS[@]}" "$SSH_USER@$SSH_HOST" "$@"; }

echo "Préparation de $APP_ROOT sur $SSH_HOST"
remote "sudo mkdir -p '$APP_ROOT/app' '$APP_ROOT/data' '$APP_ROOT/backup' && sudo chown -R '$SSH_USER:$SSH_USER' '$APP_ROOT'"

STAMP=$(date -u +%Y%m%dT%H%M%SZ)
if remote "test -d '$APP_ROOT/app'"; then
  remote "tar -C '$APP_ROOT' -czf '$APP_ROOT/backup/app-$STAMP.tgz' app data || true"
fi

echo "Copie de la publication"
scp "${SCP_OPTS[@]}" -r publish "$SSH_USER@$SSH_HOST:/tmp/famirepere-publish"
remote "sudo systemctl stop '$SERVICE_NAME' >/dev/null 2>&1 || true"
remote "rsync -a --delete --exclude appsettings.Production.json /tmp/famirepere-publish/ '$APP_ROOT/app/'"
remote "rm -rf /tmp/famirepere-publish"

UNIT=$(sed -e "s|__APP_ROOT__|$APP_ROOT|g" -e "s|__LISTEN_PORT__|$LISTEN_PORT|g" deploy/systemd.service.template)
remote "cat > /tmp/famirepere.service" <<<"$UNIT"
remote "sudo mv /tmp/famirepere.service /etc/systemd/system/${SERVICE_NAME}.service && sudo systemctl daemon-reload && sudo systemctl enable '$SERVICE_NAME' && sudo systemctl start '$SERVICE_NAME'"

echo "Attente de $HEALTH_URL"
for _ in 1 2 3 4 5 6 7 8 9 10; do
  if remote "curl -fsS '$HEALTH_URL'"; then
    echo
    echo "FamiRepère répond."
    exit 0
  fi
  sleep 2
done
echo "Le contrôle de santé a échoué." >&2
remote "sudo systemctl status '$SERVICE_NAME' --no-pager" || true
remote "journalctl -u '$SERVICE_NAME' -n 80 --no-pager" || true
exit 1
