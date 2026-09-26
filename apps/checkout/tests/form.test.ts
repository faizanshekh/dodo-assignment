import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  formatCardNumber,
  formatExpiry,
  normalizeDigits,
  validateField,
  validateForm,
} from '../src/lib/form.ts'

const now = new Date(2026, 8, 26)

test('normalizes pasted payment values to bounded digits', () => {
  assert.equal(normalizeDigits('4242 4242-4242 4242 55', 16), '4242424242424242')
  assert.equal(normalizeDigits('09 / 29', 4), '0929')
  assert.equal(normalizeDigits('a1 2b34', 3), '123')
  assert.equal(normalizeDigits('abc', 3), '')
})

test('formats full and partially entered card and expiry values', () => {
  assert.equal(formatCardNumber(''), '')
  assert.equal(formatCardNumber('4242'), '4242')
  assert.equal(formatCardNumber('42424'), '4242 4')
  assert.equal(formatCardNumber('4242424242424242'), '4242 4242 4242 4242')
  assert.equal(formatExpiry(''), '')
  assert.equal(formatExpiry('0'), '0')
  assert.equal(formatExpiry('09'), '09')
  assert.equal(formatExpiry('092'), '09 / 2')
  assert.equal(formatExpiry('0929'), '09 / 29')
})

test('requires a conventional email format and permits surrounding whitespace', () => {
  for (const email of [
    '', ' ', 'user', 'user@host', 'user@@example.com', 'a b@example.com', 'user@.com',
    '.user@example.com', 'user.@example.com', 'user..name@example.com', 'user()@example.com',
    'user@-example.com', 'user@example-.com', 'user@example..com',
  ]) {
    assert.ok(validateField('email', email, now), `Should reject ${JSON.stringify(email)}`)
  }
  for (const email of [
    'user@example.com', 'first.last@example.com', ' user+checkout@example.co.uk ',
    "o'connor@example.com", 'First.Last+checkout@example-domain.com',
  ]) {
    assert.equal(validateField('email', email, now), undefined, `Should accept ${JSON.stringify(email)}`)
  }
})

test('requires exactly sixteen card digits without a Luhn or network check', () => {
  for (const card of ['', '4242', '424242424242424', '42424242424242424', '424242424242424x', '4242 4242 4242 4242']) {
    assert.ok(validateField('cardNumber', card, now))
  }
  assert.equal(validateField('cardNumber', '1234567890123456', now), undefined)
})

test('requires exactly three CVC digits', () => {
  for (const cvc of ['', '12', '1234', '12x', ' 12']) {
    assert.ok(validateField('cvc', cvc, now))
  }
  assert.equal(validateField('cvc', '001', now), undefined)
})

test('expiry accepts the current month through its last day and rejects the past', () => {
  assert.equal(validateField('expiry', '0926', now), undefined)
  assert.equal(validateField('expiry', '0926', new Date(2026, 8, 30, 23, 59)), undefined)
  assert.equal(validateField('expiry', '1026', now), undefined)
  assert.equal(validateField('expiry', '0127', now), undefined)
  assert.ok(validateField('expiry', '0826', now))
  assert.ok(validateField('expiry', '1225', now))
})

test('expiry handles year rollover and interprets YY as 2000 + YY', () => {
  const december = new Date(2026, 11, 31)
  const january = new Date(2027, 0, 1)
  assert.equal(validateField('expiry', '1226', december), undefined)
  assert.equal(validateField('expiry', '0127', december), undefined)
  assert.ok(validateField('expiry', '1226', january))
  assert.equal(validateField('expiry', '0127', january), undefined)
  assert.ok(validateField('expiry', '0100', now))
})

test('expiry rejects missing, malformed, and impossible months', () => {
  for (const expiry of ['', '1', '092', '09266', '09/26', '0a26', '0027', '1327']) {
    assert.ok(validateField('expiry', expiry, now))
  }
})

test('form validation returns only failed fields', () => {
  const valid = { email: 'user@example.com', cardNumber: '4242424242424242', expiry: '0926', cvc: '123' }
  assert.deepEqual(validateForm(valid, now), {})
  assert.deepEqual(Object.keys(validateForm({ ...valid, email: '', cvc: '' }, now)), ['email', 'cvc'])
  assert.deepEqual(Object.keys(validateForm({ email: '', cardNumber: '', expiry: '', cvc: '' }, now)), [
    'email', 'cardNumber', 'expiry', 'cvc',
  ])
})
