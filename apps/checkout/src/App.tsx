import { useCallback, useEffect, useRef, useState } from 'react'
import CheckoutForm from './components/CheckoutForm'
import PaymentSuccess from './components/PaymentSuccess'
import ProductSummary from './components/ProductSummary'
import { createFakePaymentProcessor } from './lib/fakePayment'
import type { PaymentResult, PaymentState } from './lib/fakePayment'
import { useCheckoutSession } from './lib/useCheckoutSession'
import { formatPrice } from './lib/products'
import { createCheckoutId } from '../../../packages/sdk/src/protocol.ts'
import './App.css'

function App() {
  const { session, embedded, requestClose, notifySuccess } = useCheckoutSession()
  const [payment, setPayment] = useState<PaymentState>({ status: 'idle' })
  const [processPayment] = useState(createFakePaymentProcessor)
  const submissionLocked = useRef(false)
  const requestVersion = useRef(0)

  useEffect(() => () => {
    // Ignore a pending demo result if this checkout has been unmounted.
    requestVersion.current += 1
  }, [])

  const handleClose = useCallback(() => {
    // Also keep the successful payment committed during its short handoff.
    if (!submissionLocked.current) requestClose()
  }, [requestClose])

  useEffect(() => {
    if (!embedded) return
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      handleClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [embedded, handleClose])

  useEffect(() => {
    if (!embedded || payment.status !== 'success') return
    // Demo-only: real payment session IDs must come from a trusted backend.
    const sessionId = `sess_${createCheckoutId()}`
    const timeout = window.setTimeout(() => notifySuccess(sessionId), 900)
    return () => window.clearTimeout(timeout)
  }, [embedded, payment.status, notifySuccess])

  async function handlePayment(cardNumber: string) {
    // A ref locks synchronously, before React can render the disabled controls.
    if (submissionLocked.current || session.status !== 'ready') return
    submissionLocked.current = true
    const version = ++requestVersion.current
    setPayment({ status: 'processing' })

    let result: PaymentResult
    try {
      result = await processPayment(cardNumber)
    } catch {
      result = {
        status: 'retryable_error',
        message: 'We couldn’t complete the demo payment. No charge was made. Please try again.',
      }
    }

    if (version !== requestVersion.current) return
    submissionLocked.current = result.status === 'success'
    setPayment(result)
  }

  function clearPaymentError() {
    setPayment((current) => (
      current.status === 'declined' || current.status === 'retryable_error'
        ? { status: 'idle' }
        : current
    ))
  }

  return (
    <main className="checkout-page">
      <section className="checkout-card" aria-label="Dodo Checkout">
        <header className="checkout-header">
          <p className="checkout-brand">Dodo <span>Checkout</span></p>
          <button
            className="close-button"
            type="button"
            aria-label="Close checkout"
            disabled={payment.status === 'processing' || (embedded && payment.status === 'success')}
            onClick={handleClose}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="m7 7 10 10M17 7 7 17" />
            </svg>
          </button>
        </header>

        {session.status === 'ready' ? (
          <>
            <ProductSummary product={session.product} />
            {payment.status === 'success' ? (
              <PaymentSuccess />
            ) : (
              <CheckoutForm
                payment={payment}
                priceLabel={formatPrice(session.product.price)}
                onPay={handlePayment}
                onEdit={clearPaymentError}
              />
            )}
          </>
        ) : (
          <section className="checkout-notice" role={session.status === 'error' ? 'alert' : 'status'}>
            <h1>{session.status === 'error' ? 'Checkout unavailable' : 'Loading checkout…'}</h1>
            {session.status === 'error' && <p>{session.message}</p>}
          </section>
        )}
      </section>
    </main>
  )
}

export default App
