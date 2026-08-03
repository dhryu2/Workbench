#!/usr/bin/env bash
# ============================================================
#  Workbench 사용량 집계 조회 — 개발머신에서 실행
#
#  설계 원칙: 공개 오리진(workbench.dhryu.dev)에는 읽기 경로가 존재하지 않는다.
#  숨긴 URL도, 토큰 쿼리도, 401을 돌려줄 엔드포인트도 없다. 수치는 오직
#  Tailscale + SSH로 서버에 들어가 컨테이너 안의 H2 파일 DB를 직접 읽어서만 볼 수 있다.
#
#  사용법:
#    ./scripts/stats.sh                # 요약 표
#    ./scripts/stats.sh raw            # usage_stat 전체 행
#    ./scripts/stats.sh "SELECT ..."   # 임의 SQL(읽기 전용으로 쓸 것)
# ============================================================
set -euo pipefail

cd "$(dirname "$0")/.."

ENV_FILE=".env.production"
[ -f "$ENV_FILE" ] || { echo "❌ $ENV_FILE 없음"; exit 1; }

# .env.production 로드 (deploy.sh와 동일한 방식)
set -a; source "$ENV_FILE"; set +a

: "${DEPLOY_HOST:?}"; : "${DEPLOY_SSH_USER:?}"; : "${DEPLOY_SSH_PORT:=22}"
: "${PROJECT_NAME:=workbench}"

SSH_KEY_EXPANDED="${DEPLOY_SSH_KEY/#\~/$HOME}"
SSH_OPTS=(-p "$DEPLOY_SSH_PORT")
[ -n "${DEPLOY_SSH_KEY:-}" ] && SSH_OPTS+=(-i "$SSH_KEY_EXPANDED")
SSH_TARGET="${DEPLOY_SSH_USER}@${DEPLOY_HOST}"

CONTAINER="${PROJECT_NAME}-backend"
# 앱이 DB 파일을 잡고 있으므로 AUTO_SERVER=TRUE로 같은 파일에 붙는다.
# IFEXISTS=TRUE — 경로가 틀렸을 때 빈 DB를 새로 만들지 않고 실패시킨다.
DB_URL='jdbc:h2:file:/app/data/workbench;AUTO_SERVER=TRUE;IFEXISTS=TRUE'

SUMMARY_SQL="SELECT scope_key AS scope, count, updated_at FROM usage_stat ORDER BY CASE WHEN scope_key = 'site' THEN 0 ELSE 1 END, count DESC;"
RAW_SQL="SELECT * FROM usage_stat ORDER BY id;"

case "${1:-summary}" in
  summary) SQL="$SUMMARY_SQL" ;;
  raw)     SQL="$RAW_SQL" ;;
  *)       SQL="$1" ;;
esac

# SQL을 그대로 ssh 인자로 넘기면 원격 셸이 한 번 더 단어분해해서 따옴표가 깨진다.
# base64로 실어 보내고 원격에서 복원한다.
SQL_B64="$(printf '%s' "$SQL" | base64 | tr -d '\n')"

echo "▶ ${SSH_TARGET} → ${CONTAINER} → H2"
echo

# 원격 스크립트는 heredoc(stdin)으로 전달하므로 docker exec에 -i를 주지 않는다(stdin 경합 방지).
ssh "${SSH_OPTS[@]}" "$SSH_TARGET" bash -s <<REMOTE
set -euo pipefail
SQL="\$(printf '%s' '${SQL_B64}' | base64 -d)"
docker exec '${CONTAINER}' \
  java -cp /app/h2.jar org.h2.tools.Shell \
    -url '${DB_URL}' -user sa -password '' -sql "\$SQL"
REMOTE
