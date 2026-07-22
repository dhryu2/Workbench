// 벤치마크 진입점 — 시드 라벨로 buildZpl 을 돌려 stdout 에 ZPL 을 찍는다.
// scripts/zpl-benchmark.sh 가 esbuild 로 번들해 기대 37줄과 diff 한다(§5.5-1).
import { buildZpl } from '../src/tools/zpl-editor/zpl-generate'
import { SEED_ELEMENTS, SEED_SPEC } from '../src/tools/zpl-editor/seed'
import type { ZplState } from '../src/tools/zpl-editor/types'

const state = {
  els: SEED_ELEMENTS,
  unit: SEED_SPEC.unit,
  w: SEED_SPEC.w,
  h: SEED_SPEC.h,
  dpmm: SEED_SPEC.dpmm,
} as unknown as ZplState

console.log(buildZpl(state).map((l) => l.text).join('\n'))
