import { useEffect, useRef, useState } from 'react'
import CheckoutForm from './components/CheckoutForm'
import PaymentSuccess from './components/PaymentSuccess'
import ProductSummary from './components/ProductSummary'
import { createFakePaymentProcessor } from './lib/fakePayment'
import type { PaymentResult, PaymentState } from './lib/fakePayment'
import './App.css'

function App() {
  const [payment, setPayment] = useState<PaymentState>({ status: 'idle' })
  const [processPayment] = useState(createFakePaymentProcessor)
  const submissionLocked = useRef(false)
  const requestVersion = useRef(0)

  useEffect(() => () => {
    // Ignore a pending demo result if this checkout has been unmounted.
    requestVersion.current += 1
  }, [])

  async function handlePayment(cardNumber: string) {
    // A ref locks synchronously, before React can render the disabled controls.
    if (submissionLocked.current) return
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
            disabled={payment.status === 'processing'}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="m7 7 10 10M17 7 7 17" />
            </svg>
          </button>
        </header>

        <ProductSummary />

        {payment.status === 'success' ? (
          <PaymentSuccess />
        ) : (
          <CheckoutForm
            payment={payment}
            onPay={handlePayment}
            onEdit={clearPaymentError}
          />
        )}
      </section>
    </main>
  )
}

export default App
