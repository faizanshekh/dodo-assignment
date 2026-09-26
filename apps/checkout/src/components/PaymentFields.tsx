export default function PaymentFields() {
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
        />
      </div>

      <div className="field">
        <label htmlFor="card-number">Card number</label>
        <input
          id="card-number"
          name="card-number"
          type="text"
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="1234 5678 9012 3456"
        />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="card-expiry">Expiry</label>
          <input
            id="card-expiry"
            name="card-expiry"
            type="text"
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="MM / YY"
          />
        </div>

        <div className="field">
          <label htmlFor="card-cvc">CVC</label>
          <input
            id="card-cvc"
            name="card-cvc"
            type="text"
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="123"
          />
        </div>
      </div>
    </div>
  )
}
