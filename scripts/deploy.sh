#!/usr/bin/env bash
# ============================================================
#  Workbench 운영 배포 — 개발머신에서 한 번에 실행
#  빌드(amd64) → GHCR push → 서버로 compose/.env 전송 → pull + up
#
#  사용법:
#    ./scripts/deploy.sh              # latest 태그로 배포
#    IMAGE_TAG=20260723 ./scripts/deploy.sh
# ============================================================
set -euo pipefail

cd "$(dirname "$0")/.."

ENV_FILE=".env.production"
[ -f "$ENV_FILE" ] || { echo "❌ $ENV_FILE 없음"; exit 1; }

# .env.production 로드 (직접 source — macOS bash 3.2에서 프로세스치환 source는 불안정)
set -a; source "$ENV_FILE"; set +a

: "${FRONTEND_IMAGE:?}"; : "${BACKEND_IMAGE:?}"; : "${IMAGE_TAG:=latest}"
: "${DEPLOY_HOST:?}"; : "${DEPLOY_SSH_USER:?}"; : "${DEPLOY_SSH_PORT:=22}"
: "${DEPLOY_REMOTE_PATH:?}"; : "${VITE_API_BASE_URL:=/api}"

DATE_TAG="$(date +%Y%m%d)"
SSH_KEY_EXPANDED="${DEPLOY_SSH_KEY/#\~/$HOME}"
SSH_OPTS=(-p "$DEPLOY_SSH_PORT")
[ -n "${DEPLOY_SSH_KEY:-}" ] && SSH_OPTS+=(-i "$SSH_KEY_EXPANDED")
SSH_TARGET="${DEPLOY_SSH_USER}@${DEPLOY_HOST}"

echo "▶ 1/4  백엔드 이미지 빌드·푸시 (amd64)"
docker buildx build --platform linux/amd64 \
  --tag "${BACKEND_IMAGE}:${IMAGE_TAG}" \
  --tag "${BACKEND_IMAGE}:${DATE_TAG}" \
  --push ./backend

echo "▶ 2/4  프론트 이미지 빌드·푸시 (amd64)"
docker buildx build --platform linux/amd64 \
  --build-arg "VITE_API_BASE_URL=${VITE_API_BASE_URL}" \
  --tag "${FRONTEND_IMAGE}:${IMAGE_TAG}" \
  --tag "${FRONTEND_IMAGE}:${DATE_TAG}" \
  --push ./frontend

echo "▶ 3/4  서버로 compose/.env 전송 → ${SSH_TARGET}:${DEPLOY_REMOTE_PATH}"
ssh "${SSH_OPTS[@]}" "$SSH_TARGET" "mkdir -p '$DEPLOY_REMOTE_PATH'"
scp -P "$DEPLOY_SSH_PORT" ${DEPLOY_SSH_KEY:+-i "$SSH_KEY_EXPANDED"} \
  docker-compose.prod.yml "$SSH_TARGET:$DEPLOY_REMOTE_PATH/docker-compose.yml"
scp -P "$DEPLOY_SSH_PORT" ${DEPLOY_SSH_KEY:+-i "$SSH_KEY_EXPANDED"} \
  "$ENV_FILE" "$SSH_TARGET:$DEPLOY_REMOTE_PATH/.env"

echo "▶ 4/4  서버에서 pull + up"
ssh "${SSH_OPTS[@]}" "$SSH_TARGET" \
  "cd '$DEPLOY_REMOTE_PATH' && docker compose --env-file .env pull && docker compose --env-file .env up -d && docker compose ps"

echo "✅ 배포 완료 — https://${CORS_ALLOWED_ORIGINS#https://} (Cloudflare Tunnel → :${FRONTEND_HOST_PORT})"
