export type CheckoutModal = {
  iframe: HTMLIFrameElement
  mount: () => void
  showReady: () => void
  cleanup: () => void
}

const modalStyles = `
  :host { all: initial; }
  *, *::before, *::after { box-sizing: border-box; }
  .overlay {
    all: initial;
    box-sizing: border-box;
    display: none;
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100vh;
    height: 100dvh;
    max-width: none;
    max-height: none;
    margin: 0;
    padding: 24px 16px;
    border: 0;
    background: transparent;
    color: #222d25;
    color-scheme: light;
    font: 16px/1.5 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  .overlay[open] { display: grid; place-items: center; }
  .overlay::backdrop { background: rgb(13 22 16 / 48%); }
  .panel {
    position: relative;
    width: min(100%, 480px);
    height: min(760px, calc(100vh - 48px));
    height: min(760px, calc(100dvh - 48px));
    overflow: hidden;
    border-radius: 18px;
    background: #f5f5f2;
    box-shadow: 0 20px 80px rgb(0 0 0 / 18%);
  }
  iframe { display: block; width: 100%; height: 100%; border: 0; }
  .loading {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 24px;
    text-align: center;
    outline: none;
  }
  @media (max-width: 480px) {
    .overlay { padding: 0; }
    .panel { width: 100%; height: 100%; border-radius: 0; }
  }
`

export function createModal(checkoutUrl: string): CheckoutModal {
  if (!document.body) throw new Error('Checkout requires a document body')

  const body = document.body
  let previouslyFocused = document.activeElement
  while (previouslyFocused?.shadowRoot?.activeElement) {
    previouslyFocused = previouslyFocused.shadowRoot.activeElement
  }

  const overflowProperties = ['overflow', 'overflow-x', 'overflow-y']
  const savedOverflow = Array.from(body.style)
    .filter((property) => overflowProperties.includes(property))
    .map((property) => ({
      property,
      value: body.style.getPropertyValue(property),
      priority: body.style.getPropertyPriority(property),
    }))

  const host = document.createElement('div')
  // Inline important resets protect the shadow host from merchant-wide selectors.
  host.style.setProperty('all', 'initial', 'important')
  host.style.setProperty('display', 'block', 'important')
  host.style.setProperty('position', 'fixed', 'important')
  host.style.setProperty('inset', '0', 'important')
  host.style.setProperty('z-index', '2147483647', 'important')

  const shadow = host.attachShadow({ mode: 'closed' })
  const style = document.createElement('style')
  style.textContent = modalStyles

  const dialog = document.createElement('dialog')
  dialog.className = 'overlay'
  dialog.setAttribute('aria-label', 'Dodo checkout')
  dialog.setAttribute('aria-modal', 'true')
  dialog.setAttribute('aria-busy', 'true')

  // Processing state lives in the iframe; only its guarded Escape handler dismisses.
  const preventCancel = (event: Event) => event.preventDefault()
  dialog.addEventListener('cancel', preventCancel)

  const panel = document.createElement('div')
  panel.className = 'panel'

  const loading = document.createElement('div')
  loading.className = 'loading'
  loading.setAttribute('role', 'status')
  loading.tabIndex = -1
  loading.textContent = 'Loading secure checkout…'

  const iframe = document.createElement('iframe')
  iframe.title = 'Dodo checkout'
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms')
  iframe.referrerPolicy = 'no-referrer'
  iframe.tabIndex = -1
  iframe.style.visibility = 'hidden'
  iframe.src = checkoutUrl

  panel.append(loading, iframe)
  dialog.append(panel)
  shadow.append(style, dialog)

  let mounted = false
  let disposed = false

  return {
    iframe,
    mount() {
      if (mounted || disposed) return
      mounted = true
      body.style.setProperty('overflow', 'hidden', 'important')
      body.append(host)
      dialog.showModal()
      if (!disposed) loading.focus({ preventScroll: true })
    },
    showReady() {
      if (disposed || !mounted) return
      loading.remove()
      dialog.removeAttribute('aria-busy')
      iframe.style.visibility = 'visible'
      iframe.tabIndex = 0
      iframe.focus({ preventScroll: true })
    },
    cleanup() {
      if (disposed) return
      disposed = true
      dialog.removeEventListener('cancel', preventCancel)
      if (mounted) {
        for (const property of overflowProperties) body.style.removeProperty(property)
        for (const { property, value, priority } of savedOverflow) {
          body.style.setProperty(property, value, priority)
        }
      }
      host.remove()
      if (dialog.open) dialog.close()

      // Native close usually restores focus; fall back only if focus is on body.
      if (
        mounted && document.activeElement === body &&
        previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected
      ) {
        try {
          previouslyFocused.focus({ preventScroll: true })
        } catch {
          // A removed/inert host target must not prevent terminal callback delivery.
        }
      }
    },
  }
}
