import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createFakePaymentProcessor } from '../src/lib/fakePayment.ts'

test('payment waits for the processing delay before succeeding', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] })
  const processPayment = createFakePaymentProcessor()
  let settled = false
  const payment = processPayment('4242424242424242').then((result) => {
    settled = true
    return result
  })

  context.mock.timers.tick(1199)
  await Promise.resolve()
  assert.equal(settled, false)
  context.mock.timers.tick(1)
  assert.deepEqual(await payment, { status: 'success' })
  assert.equal(settled, true)
})

test('declines the decline test card and identifies unsupported demo cards', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] })
  const processPayment = createFakePaymentProcessor()
  const declinedPayment = processPayment('4000000000000002')
  context.mock.timers.tick(1200)
  const declined = await declinedPayment
  assert.equal(declined.status, 'declined')
  assert.ok(declined.status === 'declined')
  assert.equal(declined.reason, 'card_declined')
  assert.match(declined.message, /declined/i)

  const unsupportedPayment = processPayment('1234567890123456')
  context.mock.timers.tick(1200)
  const unsupported = await unsupportedPayment
  assert.ok(unsupported.status === 'declined')
  assert.equal(unsupported.reason, 'unsupported_card')
  assert.match(unsupported.message, /demo/i)
  assert.match(unsupported.message, /4242 4242 4242 4242/)
})

test('0341 retries are local to each processor and other cards do not consume or reset attempts', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] })
  const processPayment = createFakePaymentProcessor()
  const pay = async (card: string, processor = processPayment) => {
    const payment = processor(card)
    context.mock.timers.tick(1200)
    return payment
  }

  await pay('4000000000000002')
  await pay('1234567890123456')
  await pay('4242424242424242')
  const firstAttempt = await pay('4000000000000341')
  assert.ok(firstAttempt.status === 'retryable_error')
  assert.match(firstAttempt.message, /no charge was made/i)

  await pay('4000000000000002')
  assert.deepEqual(await pay('4000000000000341'), { status: 'success' })
  assert.deepEqual(await pay('4000000000000341'), { status: 'success' })

  const freshAttempt = await pay('4000000000000341', createFakePaymentProcessor())
  assert.equal(freshAttempt.status, 'retryable_error')
})
