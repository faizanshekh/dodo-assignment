import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  CHANNEL,
  VERSION,
  createCheckoutId,
  isCheckoutMessage,
  isHttpOrigin,
  isInitMessage,
  matchesPeer,
} from '../src/protocol.ts'

const envelope = { channel: CHANNEL, version: VERSION, checkoutId: 'checkout-123' }
const init = { ...envelope, type: 'CHECKOUT_INIT', payload: { productId: 'prod_123' } }
const ready = { ...envelope, type: 'CHECKOUT_READY' }
const success = { ...envelope, type: 'CHECKOUT_SUCCESS', payload: { sessionId: 'demo-session-123' } }
const close = { ...envelope, type: 'CHECKOUT_CLOSE', payload: { reason: 'user' } }
const error = { ...envelope, type: 'CHECKOUT_ERROR', payload: { code: 'UNSUPPORTED_PRODUCT', message: 'Product is unavailable.' } }

test('accepts each protocol message shape in its intended direction', () => {
  assert.equal(isInitMessage(init), true)
  assert.equal(isCheckoutMessage(init), false)
  for (const message of [ready, success, close, error]) {
    assert.equal(isCheckoutMessage(message), true)
    assert.equal(isInitMessage(message), false)
  }
})

test('rejects malformed envelopes, unknown message types, channels, and versions', () => {
  for (const value of [null, undefined, [], 'CHECKOUT_READY', 1, true, {}]) {
    assert.equal(isCheckoutMessage(value), false)
    assert.equal(isInitMessage(value), false)
  }
  for (const changes of [
    { channel: 'other-checkout' }, { version: 2 }, { version: '1' },
    { checkoutId: '' }, { checkoutId: '  ' }, { checkoutId: 123 },
    { type: 'CHECKOUT_UNKNOWN' }, { cardNumber: '4242424242424242' },
  ]) {
    assert.equal(isCheckoutMessage({ ...ready, ...changes }), false)
    assert.equal(isInitMessage({ ...init, ...changes }), false)
  }
  assert.equal(isCheckoutMessage({ channel: CHANNEL, version: VERSION, type: 'CHECKOUT_READY' }), false)
  assert.equal(isInitMessage({ channel: CHANNEL, version: VERSION, type: 'CHECKOUT_INIT', payload: init.payload }), false)
  assert.equal(isCheckoutMessage({ ...ready, payload: {} }), false)
  assert.equal(isCheckoutMessage({ ...ready, payload: undefined }), false)
  assert.equal(isCheckoutMessage({ ...ready, [Symbol('extra')]: 'hidden' }), false)
})

test('init accepts only a non-empty product ID and rejects untrusted product details', () => {
  for (const payload of [
    undefined, null, [], {}, { productId: '' }, { productId: ' ' }, { productId: 123 },
    { productId: 'prod_123', price: 1 }, { productId: 'prod_123', name: 'Untrusted product' },
    { productId: 'prod_123', cvc: '123' },
  ]) {
    assert.equal(isInitMessage({ ...init, payload }), false)
  }
  assert.equal(isInitMessage({ ...init, extra: true }), false)
  assert.equal(isInitMessage({ ...init, payload: Object.create({ productId: 'prod_123' }) }), false)
})

test('outbound messages reject missing, invalid, and sensitive extra payload fields', () => {
  for (const message of [success, close, error]) {
    for (const payload of [undefined, null, [], {}, { ...message.payload, cardNumber: '4242424242424242' }, { ...message.payload, cvc: '123' }]) {
      assert.equal(isCheckoutMessage({ ...message, payload }), false)
    }
  }
  for (const sessionId of ['', ' ', 1, null]) {
    assert.equal(isCheckoutMessage({ ...success, payload: { sessionId } }), false)
  }
  for (const reason of ['', 'escape', 'success', null]) {
    assert.equal(isCheckoutMessage({ ...close, payload: { reason } }), false)
  }
  for (const payload of [
    { code: '', message: 'Error' }, { code: 'ERROR', message: ' ' },
    { code: 1, message: 'Error' }, { code: 'ERROR', message: 1 },
  ]) {
    assert.equal(isCheckoutMessage({ ...error, payload }), false)
  }
})

test('accepts only canonical HTTP(S) origins', () => {
  for (const origin of ['http://localhost:5173', 'http://127.0.0.1:5173', 'https://checkout.example.com', 'https://[::1]:4433']) {
    assert.equal(isHttpOrigin(origin), true)
  }
  for (const origin of [
    '', 'null', '*', 'not a URL', 'file:///checkout', 'data:text/html,hello',
    'https://example.com/', 'https://example.com/checkout', 'https://example.com?query=1',
    'https://example.com#hash', 'https://user:password@example.com',
    'https://example.com:443', 'HTTPS://EXAMPLE.COM', ' https://example.com',
  ]) {
    assert.equal(isHttpOrigin(origin), false)
  }
})

test('peer matching requires the exact origin and source window', () => {
  const source = {}
  const origin = 'https://checkout.example.com'
  assert.equal(matchesPeer({ origin, source }, origin, source), true)
  for (const spoofedOrigin of ['http://checkout.example.com', 'https://checkout.example.com.attacker.test', 'https://other.example.com', 'null']) {
    assert.equal(matchesPeer({ origin: spoofedOrigin, source }, origin, source), false)
  }
  assert.equal(matchesPeer({ origin, source: {} }, origin, source), false)
  assert.equal(matchesPeer({ origin, source: null }, origin, null), false)
  assert.equal(matchesPeer({ origin, source: undefined }, origin, undefined), false)
  assert.equal(matchesPeer({ origin: 'null', source }, 'null', source), false)
})

test('checkout IDs use secure UUIDs and are unique across openings', () => {
  const ids = Array.from({ length: 20 }, () => createCheckoutId())
  assert.equal(new Set(ids).size, ids.length)
  for (const id of ids) {
    assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  }
})

test('checkout IDs fall back to secure random bytes and fail without secure randomness', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto')
  let calls = 0
  try {
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: {
        getRandomValues(bytes: Uint8Array) {
          calls += 1
          return bytes.fill(1)
        },
      },
    })
    assert.equal(createCheckoutId(), '01010101-0101-4101-8101-010101010101')
    assert.equal(calls, 1)
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: undefined })
    assert.throws(() => createCheckoutId(), /Secure randomness/)
  } finally {
    if (original) Object.defineProperty(globalThis, 'crypto', original)
  }
})
