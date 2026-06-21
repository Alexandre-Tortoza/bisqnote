const subtle = globalThis.crypto.subtle

/**
 * Derives a shared AES-256-GCM key for a board using PBKDF2.
 * All members who know the board password derive the same key.
 * For public boards (no password), pass the boardId as the password —
 * this produces a deterministic key shared by all members.
 */
export async function deriveBoardKey(password: string, boardId: string): Promise<CryptoKey> {
  const enc = new TextEncoder()

  const keyMaterial = await subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  )

  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(boardId),
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  )
}

/**
 * Encrypts raw bytes with AES-256-GCM.
 * Returns an ArrayBuffer with the 12-byte IV prepended to the ciphertext.
 */
export async function encryptFile(key: CryptoKey, plain: ArrayBuffer): Promise<ArrayBuffer> {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await subtle.encrypt({ name: 'AES-GCM', iv }, key, plain)
  const result = new ArrayBuffer(12 + ciphertext.byteLength)
  const view = new Uint8Array(result)
  view.set(iv, 0)
  view.set(new Uint8Array(ciphertext), 12)
  return result
}

/**
 * Decrypts AES-256-GCM ciphertext produced by encryptFile.
 * Expects the first 12 bytes to be the IV.
 */
export async function decryptFile(key: CryptoKey, enc: ArrayBuffer): Promise<ArrayBuffer> {
  const iv = new Uint8Array(enc, 0, 12)
  const ciphertext = enc.slice(12)
  return subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
}

/** Encrypts a string with AES-256-GCM and returns base64(IV + ciphertext). */
export async function encryptContent(key: CryptoKey, data: string): Promise<string> {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(data)
  const ciphertext = await subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  const combined = new Uint8Array(12 + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), 12)
  return btoa(String.fromCharCode(...combined))
}

/** Decrypts a base64(IV + ciphertext) string with AES-256-GCM and returns the plaintext. */
export async function decryptContent(key: CryptoKey, encoded: string): Promise<string> {
  const combined = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0))
  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)
  const decrypted = await subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return new TextDecoder().decode(decrypted)
}

/** Exports a CryptoKey as a base64 string for storage in the session. */
export async function exportKeyAsBase64(key: CryptoKey): Promise<string> {
  const raw = await subtle.exportKey('raw', key)
  return btoa(String.fromCharCode(...new Uint8Array(raw as ArrayBuffer)))
}

/** Imports a base64 string back into a CryptoKey for encrypt/decrypt operations. */
export async function importKeyFromBase64(base64: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)).buffer
  return subtle.importKey('raw', raw, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}
