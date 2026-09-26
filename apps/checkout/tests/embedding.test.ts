import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readEmbeddingContext } from '../src/lib/embedding.ts'

const validSearch = '?checkoutId=checkout-123&parentOrigin=http%3A%2F%2Flocalhost%3A5173'

test('standalone ignores embedding parameters', () => {
  assert.deepEqual(readEmbeddingContext('', false), { kind: 'standalone' })
  assert.deepEqual(readEmbeddingContext(validSearch, false), { kind: 'standalone' })
  assert.deepEqual(readEmbeddingContext('?parentOrigin=invalid&checkoutId=', false), { kind: 'standalone' })
})

test('embedded context requires and decodes an ID and canonical parent origin', () => {
  assert.deepEqual(readEmbeddingContext(validSearch, true), {
    kind: 'embedded', checkoutId: 'checkout-123', parentOrigin: 'http://localhost:5173',
  })
  assert.deepEqual(readEmbeddingContext('?checkoutId=another-id&parentOrigin=https%3A%2F%2Fmerchant.example', true), {
    kind: 'embedded', checkoutId: 'another-id', parentOrigin: 'https://merchant.example',
  })
})

test('embedded context rejects missing, empty, and duplicate parameters', () => {
  for (const search of [
    '', '?checkoutId=one', '?parentOrigin=https://merchant.example',
    '?checkoutId=&parentOrigin=https://merchant.example',
    '?checkoutId=%20%20&parentOrigin=https://merchant.example',
    '?checkoutId=one&parentOrigin=',
    `${validSearch}&checkoutId=checkout-456`,
    `${validSearch}&checkoutId=checkout-123`,
    `${validSearch}&parentOrigin=http%3A%2F%2Flocalhost%3A5173`,
  ]) {
    assert.deepEqual(readEmbeddingContext(search, true), { kind: 'invalid' })
  }
})

test('embedded context rejects opaque, wildcard, non-HTTP, and noncanonical origins', () => {
  for (const origin of [
    'null', '*', 'javascript:alert(1)', 'file:///checkout', 'https://merchant.example/',
    'https://merchant.example/checkout', 'https://merchant.example?query=1',
    'https://user:password@merchant.example', 'https://merchant.example:443',
  ]) {
    assert.deepEqual(readEmbeddingContext(`?checkoutId=one&parentOrigin=${encodeURIComponent(origin)}`, true), { kind: 'invalid' })
  }
})
