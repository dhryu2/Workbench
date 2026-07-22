// OpenSSH 키 인코딩 — Web Crypto로 생성한 키쌍을 OpenSSH 공개키/개인키 포맷으로 직렬화.
// 개인키는 암호화 없는 `openssh-key-v1`(cipher/kdf = none) 구조를 사용한다.
import { fromBase64Url, randomBytes, toBase64 } from './encoding'

// SSH 와이어 포맷 빌더 — uint32 길이 접두 문자열(string)/정수(mpint)를 누적한다.
class SshBuffer {
  private parts: Uint8Array[] = []
  private len = 0

  private pushRaw(b: Uint8Array): void {
    this.parts.push(b)
    this.len += b.length
  }

  uint32(n: number): this {
    const b = new Uint8Array(4)
    new DataView(b.buffer).setUint32(0, n >>> 0, false) // big-endian
    this.pushRaw(b)
    return this
  }

  // string = uint32 길이 + 원시 바이트
  bytes(b: Uint8Array): this {
    this.uint32(b.length)
    this.pushRaw(b)
    return this
  }

  cstring(s: string): this {
    return this.bytes(new TextEncoder().encode(s))
  }

  // mpint = 부호 있는 big-endian. 선행 0 제거 후, 최상위 비트가 1이면 0x00을 덧붙여 양수 유지.
  mpint(b: Uint8Array): this {
    let i = 0
    while (i < b.length - 1 && b[i] === 0) i++
    let v = b.subarray(i)
    if (v.length > 0 && (v[0] & 0x80) !== 0) {
      const nv = new Uint8Array(v.length + 1)
      nv.set(v, 1)
      v = nv
    }
    return this.bytes(v)
  }

  raw(b: Uint8Array): this {
    this.pushRaw(b)
    return this
  }

  concat(): Uint8Array {
    const out = new Uint8Array(this.len)
    let o = 0
    for (const p of this.parts) {
      out.set(p, o)
      o += p.length
    }
    return out
  }
}

function randomUint32(): number {
  const b = randomBytes(4)
  return new DataView(b.buffer, b.byteOffset, 4).getUint32(0, false)
}

// 공개키 blob + 패딩 전 개인 섹션을 받아 `-----BEGIN OPENSSH PRIVATE KEY-----` PEM 생성.
function opensshPrivatePem(publicBlob: Uint8Array, unpadded: Uint8Array): string {
  // 개인 섹션을 8바이트 블록 경계로 1,2,3… 패딩
  const block = 8
  const padLen = (block - (unpadded.length % block)) % block
  const priv = new Uint8Array(unpadded.length + padLen)
  priv.set(unpadded, 0)
  for (let i = 0; i < padLen; i++) priv[unpadded.length + i] = i + 1

  const magic = new TextEncoder().encode('openssh-key-v1\0')
  const body = new SshBuffer()
    .raw(magic)
    .cstring('none') // ciphername
    .cstring('none') // kdfname
    .cstring('') // kdfoptions
    .uint32(1) // number of keys
    .bytes(publicBlob)
    .bytes(priv)
    .concat()

  const b64 = (toBase64(body).match(/.{1,70}/g) ?? []).join('\n')
  return `-----BEGIN OPENSSH PRIVATE KEY-----\n${b64}\n-----END OPENSSH PRIVATE KEY-----`
}

export interface SshKeyPair {
  publicKey: string
  privateKey: string
}

// RSA SSH 키쌍 — Web Crypto RSA 키에서 JWK 성분(n,e,d,p,q,qi)을 뽑아 OpenSSH로 직렬화.
export async function sshRsaKeyPair(bits: number, comment: string): Promise<SshKeyPair> {
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
  const jwk = await crypto.subtle.exportKey('jwk', kp.privateKey)
  const n = fromBase64Url(jwk.n!)
  const e = fromBase64Url(jwk.e!)
  const d = fromBase64Url(jwk.d!)
  const p = fromBase64Url(jwk.p!)
  const q = fromBase64Url(jwk.q!)
  const iqmp = fromBase64Url(jwk.qi!) // qi = q^-1 mod p = iqmp

  // 공개 blob: "ssh-rsa", e, n
  const pubBlob = new SshBuffer().cstring('ssh-rsa').mpint(e).mpint(n).concat()
  const publicKey = `ssh-rsa ${toBase64(pubBlob)} ${comment}`.trim()

  // 개인 섹션: checkint×2, "ssh-rsa", n, e, d, iqmp, p, q, comment
  const ci = randomUint32()
  const inner = new SshBuffer()
    .uint32(ci)
    .uint32(ci)
    .cstring('ssh-rsa')
    .mpint(n)
    .mpint(e)
    .mpint(d)
    .mpint(iqmp)
    .mpint(p)
    .mpint(q)
    .cstring(comment)
    .concat()

  return { publicKey, privateKey: opensshPrivatePem(pubBlob, inner) }
}

// Ed25519 SSH 키쌍 — Web Crypto Ed25519(JWK x=공개 32B, d=시드 32B) → OpenSSH.
export async function sshEd25519KeyPair(comment: string): Promise<SshKeyPair> {
  // 일부 브라우저는 Ed25519 미지원 → 호출부에서 에러 처리
  const kp = (await crypto.subtle.generateKey({ name: 'Ed25519' }, true, [
    'sign',
    'verify',
  ])) as CryptoKeyPair
  const jwk = await crypto.subtle.exportKey('jwk', kp.privateKey)
  const pub = fromBase64Url(jwk.x!).subarray(0, 32)
  const seed = fromBase64Url(jwk.d!).subarray(0, 32)

  // OpenSSH ed25519 개인키 = seed(32) || pub(32)
  const priv64 = new Uint8Array(64)
  priv64.set(seed, 0)
  priv64.set(pub, 32)

  const pubBlob = new SshBuffer().cstring('ssh-ed25519').bytes(pub).concat()
  const publicKey = `ssh-ed25519 ${toBase64(pubBlob)} ${comment}`.trim()

  const ci = randomUint32()
  const inner = new SshBuffer()
    .uint32(ci)
    .uint32(ci)
    .cstring('ssh-ed25519')
    .bytes(pub)
    .bytes(priv64)
    .cstring(comment)
    .concat()

  return { publicKey, privateKey: opensshPrivatePem(pubBlob, inner) }
}
