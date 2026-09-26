import PaymentFields from './components/PaymentFields'
import ProductSummary from './components/ProductSummary'
import './App.css'

function App() {
  return (
    <main className="checkout-page">
      <section className="checkout-card" aria-label="Dodo Checkout">
        <header className="checkout-header">
          <p className="checkout-brand">Dodo <span>Checkout</span></p>
          <button className="close-button" type="button" aria-label="Close checkout">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="m7 7 10 10M17 7 7 17" />
            </svg>
          </button>
        </header>

        <ProductSummary />

        <fieldset className="checkout-fields">
          <legend className="visually-hidden">Payment details</legend>
          <PaymentFields />
        </fieldset>

        <button className="pay-button" type="button">Pay $49.00</button>
        <p className="checkout-security">
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <rect x="4.5" y="8.5" width="11" height="8" rx="2" />
            <path d="M7 8.5V6a3 3 0 0 1 6 0v2.5M10 12v1.5" />
          </svg>
          Secure checkout
        </p>
      </section>
    </main>
  )
}

export default App
