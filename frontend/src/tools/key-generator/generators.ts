// 키 생성기 카탈로그 — 12종 키의 옵션 스펙 + 생성 로직.
// 모든 암호 연산은 브라우저(Web Crypto / CSPRNG)에서 수행되며 값은 외부로 나가지 않는다.
import { nanoid } from 'nanoid'
import { v1 as uuidv1, v4 as uuidv4, v7 as uuidv7 } from 'uuid'
import { randomBytes, randomInt, toBase64, toBase64Url, toHex, toPem } from './lib/encoding'
import { sshEd25519KeyPair, sshRsaKeyPair } from './lib/ssh'
import type { GenResult, KeyGroup, KeyKind } from './types'

// ── 공용 헬퍼 ──
function clampInt(s: string | undefined, min: number, max: number, def: number): number {
  const n = Math.floor(Number(s))
  if (!Number.isFinite(n)) return def
  return Math.min(max, Math.max(min, n))
}

// count 옵션만큼 gen()을 반복해 줄바꿈으로 합친다(일괄 복사 편의).
function bulk(opts: Record<string, string>, gen: () => string): string {
  const n = clampInt(opts.count, 1, 50, 1)
  const arr: string[] = []
  for (let i = 0; i < n; i++) arr.push(gen())
  return arr.join('\n')
}

const LOWER = 'abcdefghijklmnopqrstuvwxyz'
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const DIGITS = '0123456789'
const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.<>?'

function pick(charset: string, len: number): string {
  let out = ''
  for (let i = 0; i < len; i++) out += charset[randomInt(charset.length)]
  return out
}

// 각 문자 클래스를 최소 1개 보장한 뒤 나머지를 채우고 Fisher–Yates로 셔플.
function genPassword(len: number): string {
  const classes = [LOWER, UPPER, DIGITS, SYMBOLS]
  const all = classes.join('')
  const chars: string[] = []
  if (len >= classes.length) {
    for (const c of classes) chars.push(c[randomInt(c.length)])
  }
  while (chars.length < len) chars.push(all[randomInt(all.length)])
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    const tmp = chars[i]
    chars[i] = chars[j]
    chars[j] = tmp
  }
  return chars.slice(0, len).join('')
}

function charsetFor(kind: string): string {
  if (kind === 'alpha') return LOWER + UPPER
  if (kind === 'num') return DIGITS
  return LOWER + UPPER + DIGITS // alnum
}

function single(value: string, meta: string): GenResult {
  return { outputs: [{ labelKey: '', value }], meta }
}

function pair(pub: string, priv: string, meta: string): GenResult {
  return {
    outputs: [
      { labelKey: 'kg_out_public', value: pub },
      { labelKey: 'kg_out_private', value: priv },
    ],
    meta,
  }
}

// ── 옵션 스펙 조각(재사용) ──
const countOpt = { key: 'count', type: 'number' as const, labelKey: 'kg_o_count', def: '1', min: 1, max: 50, step: 1 }
const fmtHexB64 = {
  key: 'fmt',
  type: 'select' as const,
  labelKey: 'kg_o_format',
  def: 'hex',
  choices: [
    { value: 'hex', label: 'Hex' },
    { value: 'base64', label: 'Base64' },
  ],
}

// ── 키 종류 정의 ──

const jwt: KeyKind = {
  id: 'jwt',
  group: 'kg_g_tokens',
  nameKey: 'kg_n_jwt',
  descKey: 'kg_d_jwt',
  options: [
    {
      key: 'alg',
      type: 'select',
      labelKey: 'kg_o_algorithm',
      def: 'HS256',
      choices: [
        { value: 'HS256', label: 'HS256' },
        { value: 'HS384', label: 'HS384' },
        { value: 'HS512', label: 'HS512' },
      ],
    },
    {
      key: 'fmt',
      type: 'select',
      labelKey: 'kg_o_format',
      def: 'base64',
      choices: [
        { value: 'base64', label: 'Base64' },
        { value: 'base64url', label: 'Base64URL' },
        { value: 'hex', label: 'Hex' },
      ],
    },
  ],
  async generate(o) {
    const sizes: Record<string, number> = { HS256: 32, HS384: 48, HS512: 64 }
    const bytes = randomBytes(sizes[o.alg] ?? 32)
    const value =
      o.fmt === 'hex' ? toHex(bytes) : o.fmt === 'base64url' ? toBase64Url(bytes) : toBase64(bytes)
    return single(value, `${o.alg} · ${bytes.length * 8}-bit`)
  },
}

const uuid: KeyKind = {
  id: 'uuid',
  group: 'kg_g_tokens',
  nameKey: 'kg_n_uuid',
  descKey: 'kg_d_uuid',
  options: [
    {
      key: 'ver',
      type: 'select',
      labelKey: 'kg_o_version',
      def: 'v4',
      choices: [
        { value: 'v1', label: 'v1' },
        { value: 'v4', label: 'v4' },
        { value: 'v7', label: 'v7' },
      ],
    },
    countOpt,
  ],
  async generate(o) {
    // 버전별 함수를 클로저 안에서 직접 호출(오버로드 유니온 호출 불가 회피)
    const one = () => (o.ver === 'v1' ? uuidv1() : o.ver === 'v7' ? uuidv7() : uuidv4())
    return single(bulk(o, one), `UUID ${o.ver}`)
  },
}

const nano: KeyKind = {
  id: 'nanoid',
  group: 'kg_g_tokens',
  nameKey: 'kg_n_nanoid',
  descKey: 'kg_d_nanoid',
  options: [
    { key: 'len', type: 'number', labelKey: 'kg_o_length', def: '21', min: 2, max: 256, step: 1 },
    countOpt,
  ],
  async generate(o) {
    const len = clampInt(o.len, 2, 256, 21)
    return single(bulk(o, () => nanoid(len)), `NanoID · ${len} chars`)
  },
}

const password: KeyKind = {
  id: 'password',
  group: 'kg_g_random',
  nameKey: 'kg_n_password',
  descKey: 'kg_d_password',
  options: [
    { key: 'len', type: 'number', labelKey: 'kg_o_length', def: '20', min: 4, max: 128, step: 1 },
    countOpt,
  ],
  async generate(o) {
    const len = clampInt(o.len, 4, 128, 20)
    return single(bulk(o, () => genPassword(len)), `${len} chars`)
  },
}

const randstr: KeyKind = {
  id: 'randstr',
  group: 'kg_g_random',
  nameKey: 'kg_n_randstr',
  descKey: 'kg_d_randstr',
  options: [
    {
      key: 'cs',
      type: 'select',
      labelKey: 'kg_o_charset',
      def: 'alnum',
      choices: [
        { value: 'alnum', label: 'A–Z a–z 0–9' },
        { value: 'alpha', label: 'A–Z a–z' },
        { value: 'num', label: '0–9' },
      ],
    },
    { key: 'len', type: 'number', labelKey: 'kg_o_length', def: '32', min: 1, max: 512, step: 1 },
    countOpt,
  ],
  async generate(o) {
    const len = clampInt(o.len, 1, 512, 32)
    const cs = charsetFor(o.cs)
    return single(bulk(o, () => pick(cs, len)), `${len} chars`)
  },
}

const b64: KeyKind = {
  id: 'b64',
  group: 'kg_g_random',
  nameKey: 'kg_n_b64',
  descKey: 'kg_d_b64',
  options: [
    { key: 'bytes', type: 'number', labelKey: 'kg_o_bytes', def: '32', min: 1, max: 1024, step: 1 },
    {
      key: 'fmt',
      type: 'select',
      labelKey: 'kg_o_format',
      def: 'base64',
      choices: [
        { value: 'base64', label: 'Base64' },
        { value: 'base64url', label: 'Base64URL' },
      ],
    },
    countOpt,
  ],
  async generate(o) {
    const n = clampInt(o.bytes, 1, 1024, 32)
    return single(
      bulk(o, () => {
        const bts = randomBytes(n)
        return o.fmt === 'base64url' ? toBase64Url(bts) : toBase64(bts)
      }),
      `${n} bytes`,
    )
  },
}

const hex: KeyKind = {
  id: 'hex',
  group: 'kg_g_random',
  nameKey: 'kg_n_hex',
  descKey: 'kg_d_hex',
  options: [
    { key: 'bytes', type: 'number', labelKey: 'kg_o_bytes', def: '32', min: 1, max: 1024, step: 1 },
    countOpt,
  ],
  async generate(o) {
    const n = clampInt(o.bytes, 1, 1024, 32)
    return single(bulk(o, () => toHex(randomBytes(n))), `${n} bytes`)
  },
}

const aes: KeyKind = {
  id: 'aes',
  group: 'kg_g_symmetric',
  nameKey: 'kg_n_aes',
  descKey: 'kg_d_aes',
  options: [
    {
      key: 'bits',
      type: 'select',
      labelKey: 'kg_o_bits',
      def: '256',
      choices: [
        { value: '128', label: '128' },
        { value: '192', label: '192' },
        { value: '256', label: '256' },
      ],
    },
    fmtHexB64,
  ],
  async generate(o) {
    const bits = clampInt(o.bits, 128, 256, 256)
    const bts = randomBytes(bits / 8)
    return single(o.fmt === 'base64' ? toBase64(bts) : toHex(bts), `AES ${bits}-bit`)
  },
}

const hmac: KeyKind = {
  id: 'hmac',
  group: 'kg_g_symmetric',
  nameKey: 'kg_n_hmac',
  descKey: 'kg_d_hmac',
  options: [
    {
      key: 'size',
      type: 'select',
      labelKey: 'kg_o_size',
      def: '256',
      choices: [
        { value: '256', label: 'SHA-256 (32B)' },
        { value: '384', label: 'SHA-384 (48B)' },
        { value: '512', label: 'SHA-512 (64B)' },
      ],
    },
    fmtHexB64,
  ],
  async generate(o) {
    const map: Record<string, number> = { '256': 32, '384': 48, '512': 64 }
    const n = map[o.size] ?? 32
    const bts = randomBytes(n)
    return single(o.fmt === 'base64' ? toBase64(bts) : toHex(bts), `HMAC · ${n * 8}-bit`)
  },
}

const rsa: KeyKind = {
  id: 'rsa',
  group: 'kg_g_pairs',
  nameKey: 'kg_n_rsa',
  descKey: 'kg_d_rsa',
  options: [
    {
      key: 'bits',
      type: 'select',
      labelKey: 'kg_o_bits',
      def: '2048',
      choices: [
        { value: '2048', label: '2048' },
        { value: '3072', label: '3072' },
        { value: '4096', label: '4096' },
      ],
    },
  ],
  async generate(o) {
    const bits = clampInt(o.bits, 2048, 4096, 2048)
    const kp = await crypto.subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: bits,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['sign', 'verify'],
    )
    const spki = await crypto.subtle.exportKey('spki', kp.publicKey)
    const pkcs8 = await crypto.subtle.exportKey('pkcs8', kp.privateKey)
    return pair(toPem(spki, 'PUBLIC KEY'), toPem(pkcs8, 'PRIVATE KEY'), `RSA ${bits}-bit · PKCS#8 PEM`)
  },
}

const ec: KeyKind = {
  id: 'ec',
  group: 'kg_g_pairs',
  nameKey: 'kg_n_ec',
  descKey: 'kg_d_ec',
  options: [
    {
      key: 'curve',
      type: 'select',
      labelKey: 'kg_o_curve',
      def: 'P-256',
      choices: [
        { value: 'P-256', label: 'P-256' },
        { value: 'P-384', label: 'P-384' },
        { value: 'P-521', label: 'P-521' },
      ],
    },
  ],
  async generate(o) {
    const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: o.curve }, true, [
      'sign',
      'verify',
    ])
    const spki = await crypto.subtle.exportKey('spki', kp.publicKey)
    const pkcs8 = await crypto.subtle.exportKey('pkcs8', kp.privateKey)
    return pair(toPem(spki, 'PUBLIC KEY'), toPem(pkcs8, 'PRIVATE KEY'), `EC ${o.curve} · PKCS#8 PEM`)
  },
}

const ssh: KeyKind = {
  id: 'ssh',
  group: 'kg_g_pairs',
  nameKey: 'kg_n_ssh',
  descKey: 'kg_d_ssh',
  options: [
    {
      key: 'type',
      type: 'select',
      labelKey: 'kg_o_type',
      def: 'ed25519',
      choices: [
        { value: 'ed25519', label: 'Ed25519' },
        { value: 'rsa-2048', label: 'RSA 2048' },
        { value: 'rsa-4096', label: 'RSA 4096' },
      ],
    },
    { key: 'comment', type: 'text', labelKey: 'kg_o_comment', def: 'user@workbench', monospace: true },
  ],
  async generate(o) {
    const comment = (o.comment ?? '').trim() || 'user@workbench'
    if (o.type === 'ed25519') {
      const kp = await sshEd25519KeyPair(comment)
      return pair(kp.publicKey, kp.privateKey, 'SSH · Ed25519')
    }
    const bits = o.type === 'rsa-4096' ? 4096 : 2048
    const kp = await sshRsaKeyPair(bits, comment)
    return pair(kp.publicKey, kp.privateKey, `SSH · RSA ${bits}-bit`)
  },
}

// ── 그룹/조회 ──
export const KEY_GROUPS: KeyGroup[] = [
  { id: 'kg_g_tokens', kinds: [jwt, uuid, nano] },
  { id: 'kg_g_random', kinds: [password, randstr, b64, hex] },
  { id: 'kg_g_symmetric', kinds: [aes, hmac] },
  { id: 'kg_g_pairs', kinds: [rsa, ec, ssh] },
]

export const ALL_KINDS: KeyKind[] = KEY_GROUPS.flatMap((g) => g.kinds)

export const kindById = (id: string): KeyKind | undefined => ALL_KINDS.find((k) => k.id === id)

// 무거운 비동기 생성(키쌍) — 선택 즉시 자동 실행하지 않고 명시적 [생성]을 요구하는 그룹.
export const PAIRS_GROUP = 'kg_g_pairs'
