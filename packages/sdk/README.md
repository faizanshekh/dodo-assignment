# Dodo Checkout SDK

This dependency-free browser SDK opens the demo checkout in a cross-origin iframe.
Build from the repository root with `npm run build --workspace=packages/sdk`.
The single output file is `packages/sdk/dist/checkout-sdk.js`; its browser global
exposes only `DodoCheckout.open()` and `DodoCheckout.close()`.

## Local setup

Start checkout on `http://localhost:5173` with
`npm run dev --workspace=apps/checkout -- --host localhost --port 5173 --strictPort`.
Serve a merchant page from a different HTTP origin, for example
`http://localhost:4173`. Different ports count as different origins. Opening a
merchant page directly with `file://` is unsupported. `apps/demo` is not required
or implemented by this SDK integration.

`VITE_CHECKOUT_URL` is a **build-time SDK setting**, defaulting to
`http://localhost:5173`. Set it in `packages/sdk/.env.local` or the build process
when checkout is hosted elsewhere, then rebuild. It must be an absolute HTTP(S)
URL without embedded credentials and must differ from the merchant's origin.
Use HTTPS for production hosts. The merchant API deliberately accepts no URL,
price, or product name.

```html
<button id="buy">Buy Developer Pro</button>
<script src="/checkout-sdk.js"></script>
<script>
  document.getElementById('buy').addEventListener('click', () => {
    DodoCheckout.open({
      productId: 'prod_123',
      onSuccess: ({ sessionId }) => {
        // Update the merchant's UI using the demo session identifier.
      },
      onClose: ({ reason }) => {
        // reason is 'user' or 'programmatic'.
      },
      onError: ({ code, message }) => {
        // Show an appropriate merchant-side error message.
      },
    });
  });
</script>
```

Serve the built script at the example `/checkout-sdk.js` path. The script creates
the modal; the merchant does not create an iframe. Call `DodoCheckout.close()`
to explicitly dismiss an active checkout, including during processing.

## Lifecycle and errors

An active checkout ignores further `open()` calls entirely and retains a snapshot
of its original product ID and callbacks. Callbacks are optional and must be
functions when supplied. Invalid options report `INVALID_OPTIONS`; a missing or
blank product ID reports `INVALID_PRODUCT_ID`; an unusable URL, merchant origin,
or secure identifier generator reports `CHECKOUT_CONFIG_ERROR`. These pre-open
errors invoke a valid `onError`, or throw an `Error` with a `code` property when
no valid error handler exists.

The SDK waits up to 15 seconds for a validated `CHECKOUT_READY` before revealing
and focusing the iframe. It sends `CHECKOUT_INIT` only after READY and safely
resends INIT for duplicate READY messages. A frame load error or readiness timeout
ends the checkout with `CHECKOUT_LOAD_FAILED`. Browser iframe error events do not
cover all network failures, so the readiness timeout remains the fallback.

Only one terminal callback can fire per opened session: success, close, or error.
An unsupported product is terminal (`PRODUCT_NOT_FOUND`); recoverable declines
and payment errors stay inside checkout. Success does not invoke `onClose`.
The checkout holds its successful UI briefly before sending success; user Close
and Escape remain disabled during processing and that success handoff.

Cleanup completes the session, removes listeners/timeouts/modal, restores the exact
original inline body overflow declarations and their priorities, and restores
host focus when the original element remains connected. Cleanup happens before
merchant callbacks so thrown callbacks and callbacks that reopen checkout cannot
leave the old modal behind. The active-session slot stays occupied during cleanup
to prevent native focus restoration handlers from reopening halfway through it,
then clears before the terminal callback. `close()` without an active checkout is
a no-op.

## Isolation and protocol trust

The shell uses a Shadow DOM and native modal dialog for style isolation, host
inertness, and focus containment. Backdrop clicks do not dismiss it. Native dialog
Escape is canceled because only checkout knows whether a payment is processing;
the iframe handles permitted user Escape dismissal.

Messages require the exact configured checkout origin, the current iframe window,
the protocol channel/version, the current random checkout ID, and a strict allowed
message shape. INIT uses the exact checkout origin as its target; it never uses
`*`. Old iframe/session messages and terminal messages before READY are ignored.
Only the product ID, session ID, close reason, or defined errors cross the boundary;
payment fields and attempt details stay inside checkout.

The iframe sandbox permits `allow-scripts allow-same-origin allow-forms`. Preserving the
checkout origin is necessary for exact origin checks, so SDK and checkout **must
be on different origins**. `allow-forms` is required for the browser to dispatch
the existing React form's submit event; its handler prevents default submission
and performs only the demo flow. Popups and top navigation remain sandboxed.
The parent origin in the URL is routing context, not merchant
authentication. Client-generated demo session IDs and the client-side catalogue
are not proof of payment: a production backend would authenticate merchants and
product/session IDs, authorize embedding, and create and verify payment sessions.
