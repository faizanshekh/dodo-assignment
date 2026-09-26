import { useLayoutEffect, useRef } from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'
import {
  formatCardNumber,
  formatExpiry,
  normalizeDigits,
} from '../lib/form'
import type { CheckoutField, CheckoutValues, FormErrors } from '../lib/form'

type PaymentFieldsProps = {
  values: CheckoutValues
  errors: FormErrors
  onChange: (field: CheckoutField, value: string) => void
  onBlur: (field: CheckoutField) => void
}

type NumericField = 'cardNumber' | 'expiry' | 'cvc'

function caretAfterDigits(value: string, count: number) {
  if (count === 0) return 0

  let digits = 0
  for (let index = 0; index < value.length; index += 1) {
    if (/\d/.test(value[index])) digits += 1
    if (digits === count) return index + 1
  }

  return value.length
}

export default function PaymentFields({
  values,
  errors,
  onChange,
  onBlur,
}: PaymentFieldsProps) {
  const pendingCaret = useRef<{
    input: HTMLInputElement
    position: number
  } | null>(null)

  function restoreCaret() {
    const pending = pendingCaret.current
    if (pending && document.activeElement === pending.input) {
      pending.input.setSelectionRange(pending.position, pending.position)
    }
    pendingCaret.current = null
  }

  useLayoutEffect(restoreCaret)

  function updateNumeric(
    field: NumericField,
    input: HTMLInputElement,
    digits: string,
    digitsBeforeCaret: number,
  ) {
    const formatted = field === 'cardNumber'
      ? formatCardNumber(digits)
      : field === 'expiry' ? formatExpiry(digits) : digits

    pendingCaret.current = {
      input,
      position: caretAfterDigits(formatted, digitsBeforeCaret),
    }
    onChange(field, digits)

    // Restore the caret even when filtering a character leaves the value unchanged.
    queueMicrotask(restoreCaret)
  }

  function handleNumericChange(
    field: NumericField,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const input = event.currentTarget
    const limit = field === 'cardNumber' ? 16 : field === 'expiry' ? 4 : 3
    const caret = input.selectionStart ?? input.value.length
    updateNumeric(
      field,
      input,
      normalizeDigits(input.value, limit),
      normalizeDigits(input.value.slice(0, caret), limit).length,
    )
  }

  function handleSeparatorDeletion(
    field: NumericField,
    event: KeyboardEvent<HTMLInputElement>,
  ) {
    if (
      (event.key !== 'Backspace' && event.key !== 'Delete') ||
      event.ctrlKey || event.metaKey || event.altKey
    ) return

    const input = event.currentTarget
    const caret = input.selectionStart
    if (caret === null || caret !== input.selectionEnd) return

    const isBackspace = event.key === 'Backspace'
    const adjacent = input.value[isBackspace ? caret - 1 : caret]
    if (!adjacent || /\d/.test(adjacent)) return

    const digitsBeforeCaret = normalizeDigits(input.value.slice(0, caret), 16).length
    const deleteIndex = digitsBeforeCaret - (isBackspace ? 1 : 0)
    const digits = values[field]
    if (deleteIndex < 0 || deleteIndex >= digits.length) return

    event.preventDefault()
    updateNumeric(
      field,
      input,
      digits.slice(0, deleteIndex) + digits.slice(deleteIndex + 1),
      deleteIndex,
    )
  }

  return (
    <div className="payment-fields">
      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          spellCheck={false}
          autoCapitalize="none"
          value={values.email}
          onChange={(event) => onChange('email', event.currentTarget.value)}
          onBlur={() => onBlur('email')}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'email-error' : undefined}
        />
        {errors.email && <p className="field-error" id="email-error">{errors.email}</p>}
      </div>

      <div className="field">
        <label htmlFor="card-number">Card number</label>
        <input
          id="card-number"
          name="cardNumber"
          type="text"
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="1234 5678 9012 3456"
          value={formatCardNumber(values.cardNumber)}
          onChange={(event) => handleNumericChange('cardNumber', event)}
          onKeyDown={(event) => handleSeparatorDeletion('cardNumber', event)}
          onBlur={() => onBlur('cardNumber')}
          aria-invalid={Boolean(errors.cardNumber)}
          aria-describedby={errors.cardNumber ? 'card-number-error' : undefined}
        />
        {errors.cardNumber && (
          <p className="field-error" id="card-number-error">{errors.cardNumber}</p>
        )}
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="card-expiry">Expiry</label>
          <input
            id="card-expiry"
            name="expiry"
            type="text"
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="MM / YY"
            value={formatExpiry(values.expiry)}
            onChange={(event) => handleNumericChange('expiry', event)}
            onKeyDown={(event) => handleSeparatorDeletion('expiry', event)}
            onBlur={() => onBlur('expiry')}
            aria-invalid={Boolean(errors.expiry)}
            aria-describedby={errors.expiry ? 'card-expiry-error' : undefined}
          />
          {errors.expiry && (
            <p className="field-error" id="card-expiry-error">{errors.expiry}</p>
          )}
        </div>

        <div className="field">
          <label htmlFor="card-cvc">CVC</label>
          <input
            id="card-cvc"
            name="cvc"
            type="text"
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="123"
            value={values.cvc}
            onChange={(event) => handleNumericChange('cvc', event)}
            onBlur={() => onBlur('cvc')}
            aria-invalid={Boolean(errors.cvc)}
            aria-describedby={errors.cvc ? 'card-cvc-error' : undefined}
          />
          {errors.cvc && <p className="field-error" id="card-cvc-error">{errors.cvc}</p>}
        </div>
      </div>
    </div>
  )
}
