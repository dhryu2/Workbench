#!/bin/sh
# 37줄 벤치마크 검증(§5.5-1) — buildZpl(SEED) 이 기대 출력과 바이트 단위로 일치해야 한다.
# 사용: frontend/ 에서 sh scripts/zpl-benchmark.sh
set -e
cd "$(dirname "$0")/.."
npx -y esbuild scripts/zpl-benchmark-entry.ts --bundle --format=esm --platform=node --outfile=/tmp/zpl-bench.mjs --log-level=error
node /tmp/zpl-bench.mjs > /tmp/zpl-bench-out.txt
if diff -u scripts/zpl-benchmark-expected.txt /tmp/zpl-bench-out.txt; then
  echo "BENCHMARK OK — 37 lines byte-exact"
else
  echo "BENCHMARK FAILED" >&2
  exit 1
fi
