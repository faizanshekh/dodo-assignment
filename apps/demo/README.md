# Merchant demo

A vanilla HTML/CSS/JavaScript store that loads the built SDK with a normal
`<script src="/checkout-sdk.js"></script>`. The merchant passes only
`productId: 'prod_123'` and displays the SDK callbacks in an in-memory event log.
The checkout owns the product catalogue and payment form.

## Run locally

From the repository root, after `npm install`, open two terminals:

```sh
# Terminal 1: checkout
npm run dev --workspace=apps/checkout -- --host localhost --port 5173 --strictPort
```

```sh
# Terminal 2: merchant demo (builds the SDK before starting)
npm run dev:demo
```

Visit **http://localhost:4173** and click **Buy now**. Checkout runs in the iframe
from **http://localhost:5173**, a separate origin. Use `localhost` consistently.
The demo uses strict ports so a conflict is reported instead of silently switching.

The SDK defaults to checkout at `http://localhost:5173`. If
`packages/sdk/.env.local` or your environment sets `VITE_CHECKOUT_URL`, ensure it
points to that checkout server. This setting is baked into the SDK build.

## Exercise the flow

Use an email such as `buyer@example.com`, a future expiry such as `12 / 30`,
and CVC `123`. Use only these fake cards:

| Card number | Expected result |
| --- | --- |
| `4242 4242 4242 4242` | Success; modal closes and the log shows the session ID. |
| `4000 0000 0000 0002` | Declined; values remain and checkout stays open. |
| `4000 0000 0000 0341` | Retryable error first; **Try again** succeeds on the second attempt in the same checkout. |

- Opening checkout adds a **Checkout opened** entry.
- Close with the checkout's Close button or Escape while not processing. The
  log shows `Reason: user`. Reopen to start another checkout.
- To exercise programmatic close, run `DodoCheckout.close()` in the merchant
  page's browser console while checkout is open; the reason is `programmatic`.
- To exercise the terminal error callback, stop the checkout server and click
  **Buy now**. The log shows `CHECKOUT_LOAD_FAILED` and its message, after the
  SDK's readiness timeout (up to 15 seconds). Restart checkout to try again.
- Card declines and retryable payment errors stay inside checkout; they do not
  call the merchant's terminal `onError`.

## Build and preview

```sh
npm run build --workspace=apps/demo
npm run preview --workspace=apps/demo
```

Keep the checkout server running at **http://localhost:5173**. Stop the demo dev
server before previewing; both use **http://localhost:4173**.

The demo's `predev` and `prebuild` scripts build the SDK. Vite uses
`packages/sdk/dist` as its public directory, serving that browser script unchanged
in development and copying it into `apps/demo/dist` on build. Restart demo
development after changing SDK source, or rebuild the SDK in another terminal
and reload the merchant page. A standalone SDK build is:

```sh
npm run build --workspace=sdk
```

All event log entries are local to the page and disappear on reload.
