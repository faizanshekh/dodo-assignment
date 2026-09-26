# Dodo Checkout

A tiny embeddable checkout built for the Dodo Payments frontend assignment.
Payments are simulated; there is no backend or real charge.

## Live demo

Demo: [https://dodo-demo-site-ashen.vercel.app/](https://dodo-demo-site-ashen.vercel.app/)

Checkout app: [https://dodo-checkout-pearl.vercel.app/](https://dodo-checkout-pearl.vercel.app/)

## Architecture and stack

```text
Merchant site → DodoCheckout SDK → Shadow DOM modal → cross-origin iframe
  → React checkout → postMessage → SDK callbacks
```

The checkout and SDK communicate through `window.postMessage`. After the iframe loads, it sends `CHECKOUT_READY`; the SDK responds with `CHECKOUT_INIT` containing the trusted `productId`. Terminal events are returned as success, close, or error messages and mapped to the merchant callbacks.

An npm workspaces monorepo:

| Workspace | Stack and responsibility |
| --- | --- |
| `apps/checkout` | React + TypeScript + Vite; form, validation, simulated payment states |
| `packages/sdk` | Plain TypeScript; browser script, modal lifecycle, message handling |
| `apps/demo` | Vanilla JavaScript + Vite; merchant store and callback event log |

## Run locally

From the repository root, install dependencies with `npm install`, then use two terminals.

```sh
# Checkout
npm run dev --workspace=apps/checkout -- --host localhost --port 5173 --strictPort
```

```sh
# Merchant demo
npm run dev:demo
```

Open **[http://localhost:4173](http://localhost:4173)**. Checkout runs at
`http://localhost:5173`, keeping the two apps on separate origins.
The demo automatically builds and serves the SDK. Its checkout URL defaults to
`http://localhost:5173`; override `VITE_CHECKOUT_URL` when building the SDK for another host.

Checks: `npm run test --workspaces --if-present`,
`npm run lint --workspace=apps/checkout`, and `npm run build`.

## SDK usage

Serve `packages/sdk/dist/checkout-sdk.js` at `/checkout-sdk.js`, as the demo does:

```html
<button id="buy">Buy now</button>
<script src="/checkout-sdk.js"></script>
<script>
  const onSuccess = ({ sessionId }) => console.log("Success", sessionId);
  const onClose = ({ reason }) => console.log("Closed", reason);
  const onError = ({ code, message }) => console.error(code, message);

  document.querySelector("#buy").addEventListener("click", () => {
    DodoCheckout.open({
      productId: "prod_123",
      onSuccess,
      onClose,
      onError,
    });
  });
</script>
```

The demo product is **Developer Pro Plan — $49.00**, a one-time purchase.

## Test cards

Use a valid email, a future expiry, and a three-digit CVC.

| Card | Result |
| --- | --- |
| `4242 4242 4242 4242` | Succeeds |
| `4000 0000 0000 0002` | Declines |
| `4000 0000 0000 0341` | Fails once, then succeeds on retry in the same checkout |

## Security and boundaries

- Card details stay inside the cross-origin checkout and never pass to the merchant page.
- Messages validate the exact origin, source window, and `checkoutId`, plus protocol shape/version.
- The host sends only `productId` as purchase data; checkout resolves product details and price.
- Only one checkout can be active, with at most one terminal callback per session.

These are client-side demo boundaries. Merchant authentication, authoritative
product/session validation, and proof of payment require a backend.

## Two decisions I went back and forth on

**Iframe vs injecting checkout into the host DOM.** Direct injection simplifies
sizing and avoids messaging, but shares the host's DOM and styling environment.
A cross-origin iframe isolates the checkout document and payment fields; Shadow
DOM isolates the modal shell. The trade-off is extra messaging and sizing work.

**React/Next.js vs React + Vite.** Next.js offers routing and server rendering,
but this single client-side checkout needs neither. React + Vite keeps the setup
small and makes a separately hosted checkout straightforward.

## Edge cases handled

- Double Buy calls cannot open overlapping checkouts; payment submission is also guarded.
- Declines and retryable failures preserve form values and stay inside checkout.
- Checkout load failure/timeout reports an error; unknown products show an error for about one second before closing.
- The Close button and Escape cannot dismiss the checkout while a payment is processing.
- Modal cleanup restores page scrolling and the original focus target when available.
- Stale or mismatched messages are ignored.
- Responsive sizing stays within the viewport; small screens, including 320px widths, retain natural scrolling.

## What I would explore next

- Backend-created checkout/payment sessions with idempotency guarantees.
- Server-side product validation and authoritative payment-status verification.
- Automated browser/E2E tests and an accessibility audit.
- Production observability and error reporting.
- Richer payment methods.
