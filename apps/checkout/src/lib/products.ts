export type Product = {
  readonly id: string
  readonly name: string
  readonly purchaseType: string
  readonly price: number
}

const products: readonly Product[] = [
  Object.freeze({
    id: 'prod_123',
    name: 'Developer Pro Plan',
    purchaseType: 'One-time purchase',
    price: 49,
  }),
]

export function getProduct(productId: string): Product | undefined {
  return products.find((product) => product.id === productId)
}

const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatPrice(price: number): string {
  return priceFormatter.format(price)
}
