// 바이트/인코딩 유틸 — Web Crypto 산출물을 hex · base64 · base64url · PEM으로 변환.
// 모든 랜덤은 crypto.getRandomValues(CSPRNG) 기반이며, 값은 브라우저를 벗어나지 않는다.

// CSPRNG 랜덤 바이트
export function randomBytes(n: number): Uint8Array {
  const b = new Uint8Array(n)
  crypto.getRandomValues(b)
  return b
}

// [0, max) 균등 정수 — 거부 표집으로 모듈러 편향 제거(비밀번호/셔플에 사용)
export function randomInt(max: number): number {
  if (max <= 0) return 0
  // 2^32를 max로 나눈 몫*max 미만만 채택해 편향 제거
  const limit = Math.floor(0x1_0000_0000 / max) * max
  const buf = new Uint32Array(1)
  let x = 0
  do {
    crypto.getRandomValues(buf)
    x = buf[0]
  } while (x >= limit)
  return x % max
}

export function toHex(bytes: Uint8Array): string {
  let s = ''
  for (const x of bytes) s += x.toString(16).padStart(2, '0')
  return s
}

export function toBase64(bytes: Uint8Array): string {
  let bin = ''
  // 큰 입력에서도 콜스택 안전하게 청크 단위로 문자열화
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(bin)
}

export function toBase64Url(bytes: Uint8Array): string {
  return toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// base64url(패딩 유무 무관) → 바이트. JWK 성분 파싱에 사용.
export function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4))
  const bin = atob(b64 + pad)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

// DER(ArrayBuffer) → PEM. 라벨(예: 'PUBLIC KEY') + base64 64자 줄바꿈.
export function toPem(der: ArrayBuffer, label: string): string {
  const b64 = toBase64(new Uint8Array(der))
  const lines = b64.match(/.{1,64}/g) ?? []
  return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----`
}
