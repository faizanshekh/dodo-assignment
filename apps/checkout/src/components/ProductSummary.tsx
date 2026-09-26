import { formatPrice } from '../lib/products'
import type { Product } from '../lib/products'

export default function ProductSummary({ product }: { product: Product }) {
  return (
    <section className="product-summary" aria-labelledby="product-title">
      <div className="product-summary__details">
        <h1 id="product-title">{product.name}</h1>
        <p>{product.purchaseType}</p>
      </div>
      <p className="product-summary__price">{formatPrice(product.price)}</p>
    </section>
  )
}
