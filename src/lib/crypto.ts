/**
 * Crypto utilities for SpoolEase API communication
 * Uses the original WASM-based encryption from SpoolEase
 */

const SALT = 'example_salt'

let wasmDeriveKey: ((key: string, salt: string) => Uint8Array) | null = null
let wasmEncrypt: ((keyBytes: Uint8Array, data: string) => string) | null = null
let wasmDecrypt: ((keyBytes: Uint8Array, encrypted: string) => string) | null = null

let isInitialized = false
let initPromise: Promise<void> | null = null
let cachedKeyBytes: Uint8Array | null = null
let cachedPassword: string | null = null

/**
 * Initialize the WASM module using dynamic import to bypass Vite
 */
export function initWasm(): Promise<void> {
  if (isInitialized) return Promise.resolve()
  if (initPromise) return initPromise

  initPromise = (async () => {
    try {
      // Use dynamic import with variable to bypass Vite's static analysis
      const wasmJsUrl = '/pkg/device_wasm.js'
      const wasmBinaryUrl = '/pkg/device_wasm_bg.wasm'

      // Dynamically import the module
      const wasmModule = await (Function('url', 'return import(url)')(wasmJsUrl))

      // Initialize with the wasm binary
      await wasmModule.default(wasmBinaryUrl)

      // Store the functions
      wasmDeriveKey = wasmModule.derive_key
      wasmEncrypt = wasmModule.encrypt
      wasmDecrypt = wasmModule.decrypt

      isInitialized = true
      console.log('WASM crypto module initialized')
    } catch (e) {
      console.error('Failed to load WASM module:', e)
      initPromise = null
      throw new Error('Failed to load encryption module')
    }
  })()

  return initPromise
}

/**
 * Derive an encryption key from password
 */
export async function deriveKey(password: string): Promise<Uint8Array> {
  await initWasm()

  if (!wasmDeriveKey) {
    throw new Error('WASM not loaded')
  }

  // Return cached key if password hasn't changed
  if (cachedKeyBytes && cachedPassword === password) {
    return cachedKeyBytes
  }

  cachedKeyBytes = wasmDeriveKey(password, SALT)
  cachedPassword = password
  return cachedKeyBytes
}

/**
 * Encrypt data
 */
export async function encrypt(keyBytes: Uint8Array, data: string): Promise<string> {
  await initWasm()

  if (!wasmEncrypt) {
    throw new Error('WASM not loaded')
  }

  return wasmEncrypt(keyBytes, data)
}

/**
 * Decrypt data
 */
export async function decrypt(keyBytes: Uint8Array, encryptedData: string): Promise<string> {
  await initWasm()

  if (!wasmDecrypt) {
    throw new Error('WASM not loaded')
  }

  return wasmDecrypt(keyBytes, encryptedData)
}

/**
 * Get security key from URL hash
 */
export function getSecurityKeyFromUrl(): string | null {
  const hash = window.location.hash
  const match = hash.match(/sk=([^&]+)/)
  return match ? match[1] : null
}
