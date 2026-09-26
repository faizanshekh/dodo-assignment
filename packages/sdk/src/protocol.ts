export const CHANNEL = 'dodo-checkout'
export const VERSION = 1

type Envelope = {
  channel: typeof CHANNEL
  version: typeof VERSION
  checkoutId: string
}

export type InitMessage = Envelope & {
  type: 'CHECKOUT_INIT'
  payload: { productId: string }
}

export type CheckoutMessage = Envelope & (
  | { type: 'CHECKOUT_READY' }
  | { type: 'CHECKOUT_SUCCESS'; payload: { sessionId: string } }
  | { type: 'CHECKOUT_CLOSE'; payload: { reason: 'user' } }
  | { type: 'CHECKOUT_ERROR'; payload: { code: string; message: string } }
)

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Reflect.ownKeys(value).length === keys.length
    && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key))
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isEnvelope(value: unknown): value is Record<string, unknown> & Envelope {
  return isRecord(value)
    && value.channel === CHANNEL
    && value.version === VERSION
    && isNonEmptyString(value.checkoutId)
}

export function isInitMessage(value: unknown): value is InitMessage {
  return isEnvelope(value)
    && hasExactKeys(value, ['channel', 'version', 'checkoutId', 'type', 'payload'])
    && value.type === 'CHECKOUT_INIT'
    && isRecord(value.payload)
    && hasExactKeys(value.payload, ['productId'])
    && isNonEmptyString(value.payload.productId)
}

export function isCheckoutMessage(value: unknown): value is CheckoutMessage {
  if (!isEnvelope(value)) return false

  if (value.type === 'CHECKOUT_READY') {
    return hasExactKeys(value, ['channel', 'version', 'checkoutId', 'type'])
  }

  if (!hasExactKeys(value, ['channel', 'version', 'checkoutId', 'type', 'payload'])
    || !isRecord(value.payload)) return false

  switch (value.type) {
    case 'CHECKOUT_SUCCESS':
      return hasExactKeys(value.payload, ['sessionId'])
        && isNonEmptyString(value.payload.sessionId)
    case 'CHECKOUT_CLOSE':
      return hasExactKeys(value.payload, ['reason']) && value.payload.reason === 'user'
    case 'CHECKOUT_ERROR':
      return hasExactKeys(value.payload, ['code', 'message'])
        && isNonEmptyString(value.payload.code)
        && isNonEmptyString(value.payload.message)
    default:
      return false
  }
}

export function isHttpOrigin(value: string): boolean {
  try {
    const url = new URL(value)
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.origin === value
  } catch {
    return false
  }
}

export function matchesPeer(
  event: { origin: string; source: unknown },
  expectedOrigin: string,
  expectedSource: unknown,
): boolean {
  return expectedSource !== null && expectedSource !== undefined
    && isHttpOrigin(expectedOrigin)
    && event.origin === expectedOrigin
    && event.source === expectedSource
}

export function createCheckoutId(): string {
  const secureRandom = globalThis.crypto
  if (typeof secureRandom?.randomUUID === 'function') return secureRandom.randomUUID()
  if (typeof secureRandom?.getRandomValues !== 'function') {
    throw new Error('Secure randomness is required to open checkout.')
  }

  const bytes = secureRandom.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
