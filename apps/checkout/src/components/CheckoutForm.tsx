import { useLayoutEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import PaymentFields from './PaymentFields'
import { validateField, validateForm } from '../lib/form'
import type { CheckoutField, CheckoutValues, FormErrors } from '../lib/form'
import type { PaymentState } from '../lib/fakePayment'

type CheckoutFormProps = {
  payment: PaymentState
  onPay: (cardNumber: string) => Promise<void>
  onEdit: () => void
}

export default function CheckoutForm({ payment, onPay, onEdit }: CheckoutFormProps) {
  const [values, setValues] = useState<CheckoutValues>({
    email: '', cardNumber: '', expiry: '', cvc: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const formRef = useRef<HTMLFormElement>(null)
  const errorFocus = useRef<CheckoutField | null>(null)
  const isProcessing = payment.status === 'processing'
  const hasPaymentError = payment.status === 'declined' || payment.status === 'retryable_error'

  useLayoutEffect(() => {
    if (errorFocus.current) {
      const input = formRef.current?.elements.namedItem(errorFocus.current)
      if (input instanceof HTMLInputElement) input.focus()
      errorFocus.current = null
    }
  }, [errors])

  function handleChange(field: CheckoutField, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    // Once an error is visible, let the user see it clear as they correct it.
    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: validateField(field, value) }))
    }
    onEdit()
  }

  function handleBlur(field: CheckoutField) {
    setErrors((current) => ({ ...current, [field]: validateField(field, values[field]) }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isProcessing) return

    const nextErrors = validateForm(values)
    const firstInvalidField = (Object.keys(nextErrors) as CheckoutField[])[0]
    errorFocus.current = firstInvalidField ?? null
    setErrors(nextErrors)
    if (firstInvalidField) return

    void onPay(values.cardNumber)
  }

  return (
    <>
      <p className="visually-hidden" role="status">
        {isProcessing ? 'Processing your demo payment. Please wait.' : ''}
      </p>
      <form ref={formRef} onSubmit={handleSubmit} noValidate aria-label="Payment details" aria-busy={isProcessing}>
        {hasPaymentError && (
          <p className="payment-message" role="alert">
            {payment.message}
          </p>
        )}

        <fieldset className="checkout-fields" disabled={isProcessing}>
          <legend className="visually-hidden">Payment details</legend>
          <PaymentFields values={values} errors={errors} onChange={handleChange} onBlur={handleBlur} />
        </fieldset>

        <button className="pay-button" type="submit" disabled={isProcessing}>
          {isProcessing && <span className="processing-spinner" aria-hidden="true" />}
          {isProcessing ? 'Processing…' : payment.status === 'retryable_error' ? 'Try again' : 'Pay $49.00'}
        </button>
        <p className="checkout-security">
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <rect x="4.5" y="8.5" width="11" height="8" rx="2" />
            <path d="M7 8.5V6a3 3 0 0 1 6 0v2.5M10 12v1.5" />
          </svg>
          Secure checkout
        </p>
      </form>
    </>
  )
}
