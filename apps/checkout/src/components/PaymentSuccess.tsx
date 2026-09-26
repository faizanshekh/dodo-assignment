import { useEffect, useRef } from 'react'

export default function PaymentSuccess() {
  const successRef = useRef<HTMLElement>(null)

  useEffect(() => {
    successRef.current?.focus()
  }, [])

  return (
    <section
      className="payment-success"
      aria-labelledby="success-title"
      aria-describedby="success-description"
      ref={successRef}
      tabIndex={-1}
    >
      <span className="payment-success__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="m6 12 4 4 8-8" />
        </svg>
      </span>
      <h2 id="success-title">Payment successful</h2>
      <p id="success-description">Your demo purchase is complete.</p>
      <p className="payment-success__note">No real charge was made.</p>
    </section>
  )
}
