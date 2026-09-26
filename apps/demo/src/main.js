import './style.css'

const buyButton = document.querySelector('#buy-now')
const eventLog = document.querySelector('#event-log')
const emptyLog = document.querySelector('#empty-log')
let checkoutOpen = false

function logEvent(kind, title, detail) {
  emptyLog?.remove()

  const entry = document.createElement('li')
  entry.className = 'event-entry'
  entry.dataset.kind = kind

  const heading = document.createElement('div')
  heading.className = 'event-heading'

  const label = document.createElement('span')
  label.className = 'event-title'
  label.textContent = title

  const time = document.createElement('time')
  const now = new Date()
  time.className = 'event-time'
  time.dateTime = now.toISOString()
  time.textContent = now.toLocaleTimeString()

  const description = document.createElement('p')
  description.className = 'event-detail'
  description.textContent = detail

  heading.append(label, time)
  entry.append(heading, description)
  eventLog.append(entry)
}

function setCheckoutOpen(isOpen) {
  checkoutOpen = isOpen
  // Keep the trigger focusable so the SDK can restore focus before its callback.
  buyButton.setAttribute('aria-disabled', String(isOpen))
}

function handleError({ code, message }) {
  setCheckoutOpen(false)
  logEvent('error', 'Checkout error', `Code: ${code}\nMessage: ${message}`)
}

if (typeof window.DodoCheckout?.open !== 'function') {
  buyButton.disabled = true
  logEvent(
    'error',
    'Checkout unavailable',
    'Code: SDK_NOT_LOADED\nMessage: The checkout script could not be loaded. Reload the page to try again.',
  )
} else {
  buyButton.addEventListener('click', () => {
    if (checkoutOpen) return

    setCheckoutOpen(true)

    try {
      window.DodoCheckout.open({
        productId: 'prod_invalid',
        onSuccess: ({ sessionId }) => {
          setCheckoutOpen(false)
          logEvent('success', 'Payment successful', `Session ID: ${sessionId}`)
        },
        onClose: ({ reason }) => {
          setCheckoutOpen(false)
          logEvent('close', 'Checkout closed', `Reason: ${reason}`)
        },
        onError: handleError,
      })

      // Configuration errors may invoke onError synchronously without opening.
      if (checkoutOpen) {
        logEvent('opened', 'Checkout opened', 'Developer Pro Plan · $49.00')
      }
    } catch (error) {
      handleError({
        code: error.code ?? 'CHECKOUT_OPEN_FAILED',
        message: error.message ?? 'Checkout could not be opened. Please try again.',
      })
    }
  })
}
