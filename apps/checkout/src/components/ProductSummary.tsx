export default function ProductSummary() {
  return (
    <section className="product-summary" aria-labelledby="product-title">
      <div className="product-summary__details">
        <h1 id="product-title">Developer Pro Plan</h1>
        <p>One-time purchase</p>
      </div>
      <p className="product-summary__price">$49.00</p>
    </section>
  )
}
