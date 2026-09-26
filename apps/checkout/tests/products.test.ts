import assert from 'node:assert/strict'
import { test } from 'node:test'
import { formatPrice, getProduct } from '../src/lib/products.ts'

test('product ID resolves trusted product details and price', () => {
  assert.deepEqual(getProduct('prod_123'), {
    id: 'prod_123', name: 'Developer Pro Plan', purchaseType: 'One-time purchase', price: 49,
  })
  assert.ok(Object.isFrozen(getProduct('prod_123')))
})

test('unknown IDs never fall back to a valid product or accept untrusted details', () => {
  for (const productId of ['', 'prod_unknown', '__proto__', 'constructor', 'prod_123&price=1', '{"id":"prod_123","price":1}', ' prod_123 ']) {
    assert.equal(getProduct(productId), undefined)
  }
  assert.equal(getProduct('prod_123')?.price, 49)
})

test('prices consistently display USD with two decimal places', () => {
  assert.equal(formatPrice(49), '$49.00')
  assert.equal(formatPrice(0), '$0.00')
  assert.equal(formatPrice(12.5), '$12.50')
})
