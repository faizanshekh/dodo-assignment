import { createModal } from './modal.ts'
import type { CheckoutModal } from './modal.ts'
import {
  CHANNEL,
  VERSION,
  createCheckoutId,
  isCheckoutMessage,
  isHttpOrigin,
  matchesPeer,
} from './protocol.ts'
import type { InitMessage } from './protocol.ts'

export type CheckoutSuccess = { sessionId: string }
export type CheckoutClose = { reason: 'user' | 'programmatic' }
export type CheckoutError = { code: string; message: string }

export type CheckoutOptions = {
  productId: string
  onSuccess?: (result: CheckoutSuccess) => void
  onClose?: (result: CheckoutClose) => void
  onError?: (error: CheckoutError) => void
}

type TerminalResult =
  | { type: 'success'; payload: CheckoutSuccess }
  | { type: 'close'; payload: CheckoutClose }
  | { type: 'error'; payload: CheckoutError }

type Session = {
  checkoutId: string
  checkoutOrigin: string
  options: CheckoutOptions
  modal: CheckoutModal | null
  ready: boolean
  completed: boolean
  timer: number | undefined
  onMessage: (event: MessageEvent) => void
  onLoadError: () => void
}

const READY_TIMEOUT_MS = 15_000
const LOAD_ERROR: CheckoutError = {
  code: 'CHECKOUT_LOAD_FAILED',
  message: 'Checkout could not load. Please try again.',
}

let activeSession: Session | null = null

function reportOpenError(
  onError: CheckoutOptions['onError'],
  error: CheckoutError,
) {
  if (typeof onError === 'function') {
    onError(error)
    return
  }

  throw Object.assign(new Error(error.message), { code: error.code })
}

function finish(session: Session, result: TerminalResult) {
  if (activeSession !== session || session.completed) return

  session.completed = true
  window.removeEventListener('message', session.onMessage)
  window.clearTimeout(session.timer)
  session.modal?.iframe.removeEventListener('error', session.onLoadError)
  try {
    // Native dialog close restores focus synchronously. Keep its session occupied
    // until cleanup finishes so focus handlers cannot open over half-restored state.
    session.modal?.cleanup()
  } finally {
    activeSession = null
  }

  // Cleanup precedes merchant code, including callbacks that open another checkout.
  if (result.type === 'success') session.options.onSuccess?.(result.payload)
  if (result.type === 'close') session.options.onClose?.(result.payload)
  if (result.type === 'error') session.options.onError?.(result.payload)
}

function handleMessage(session: Session, event: MessageEvent) {
  if (activeSession !== session || session.completed || !session.modal) return

  const iframeWindow = session.modal.iframe.contentWindow
  if (
    !iframeWindow ||
    !matchesPeer(event, session.checkoutOrigin, iframeWindow) ||
    !isCheckoutMessage(event.data) ||
    event.data.checkoutId !== session.checkoutId
  ) return

  const message = event.data
  if (message.type === 'CHECKOUT_READY') {
    const init: InitMessage = {
      channel: CHANNEL,
      version: VERSION,
      checkoutId: session.checkoutId,
      type: 'CHECKOUT_INIT',
      payload: { productId: session.options.productId },
    }

    // Repeating INIT is safe for duplicate READY or an iframe document reload.
    iframeWindow.postMessage(init, session.checkoutOrigin)
    if (!session.ready) {
      session.ready = true
      window.clearTimeout(session.timer)
      session.modal.showReady()
    }
    return
  }

  if (!session.ready) return

  if (message.type === 'CHECKOUT_SUCCESS') {
    finish(session, { type: 'success', payload: { sessionId: message.payload.sessionId } })
  } else if (message.type === 'CHECKOUT_CLOSE') {
    finish(session, { type: 'close', payload: { reason: 'user' } })
  } else if (message.type === 'CHECKOUT_ERROR') {
    finish(session, {
      type: 'error',
      payload: { code: message.payload.code, message: message.payload.message },
    })
  }
}

export function open(options: CheckoutOptions): void {
  // A double click cannot replace the current product or its callback handlers.
  if (activeSession) return

  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    reportOpenError(undefined, {
      code: 'INVALID_OPTIONS',
      message: 'Checkout options must be an object.',
    })
    return
  }

  const { productId, onSuccess, onClose, onError } = options
  if ([onSuccess, onClose, onError].some((callback) =>
    callback !== undefined && typeof callback !== 'function',
  )) {
    reportOpenError(onError, {
      code: 'INVALID_OPTIONS',
      message: 'Checkout callbacks must be functions when provided.',
    })
    return
  }

  if (typeof productId !== 'string' || productId.trim().length === 0) {
    reportOpenError(onError, {
      code: 'INVALID_PRODUCT_ID',
      message: 'A non-empty productId is required.',
    })
    return
  }

  let checkoutUrl: URL
  try {
    checkoutUrl = new URL(import.meta.env.VITE_CHECKOUT_URL ?? 'http://localhost:5173')
    if (
      !isHttpOrigin(checkoutUrl.origin) ||
      !['http:', 'https:'].includes(checkoutUrl.protocol) ||
      checkoutUrl.username || checkoutUrl.password ||
      !isHttpOrigin(window.location.origin) ||
      checkoutUrl.origin === window.location.origin
    ) throw new Error('Invalid checkout origin')
  } catch {
    reportOpenError(onError, {
      code: 'CHECKOUT_CONFIG_ERROR',
      message: 'Checkout must use an absolute HTTP(S) URL on a different origin from the merchant.',
    })
    return
  }

  let checkoutId: string
  try {
    checkoutId = createCheckoutId()
  } catch {
    reportOpenError(onError, {
      code: 'CHECKOUT_CONFIG_ERROR',
      message: 'This browser cannot create a secure checkout identifier.',
    })
    return
  }

  checkoutUrl.searchParams.set('checkoutId', checkoutId)
  checkoutUrl.searchParams.set('parentOrigin', window.location.origin)

  const session: Session = {
    checkoutId,
    checkoutOrigin: checkoutUrl.origin,
    options: { productId, onSuccess, onClose, onError },
    modal: null,
    ready: false,
    completed: false,
    timer: undefined,
    onMessage: (event) => handleMessage(session, event),
    onLoadError: () => finish(session, { type: 'error', payload: { ...LOAD_ERROR } }),
  }

  activeSession = session
  window.addEventListener('message', session.onMessage)

  try {
    // Own the modal before mounting: focus/blur handlers can run during showModal().
    session.modal = createModal(checkoutUrl.href)
    session.modal.iframe.addEventListener('error', session.onLoadError)
    session.modal.mount()
  } catch {
    finish(session, { type: 'error', payload: { ...LOAD_ERROR } })
    return
  }

  if (activeSession !== session || session.completed || session.ready) return
  session.timer = window.setTimeout(session.onLoadError, READY_TIMEOUT_MS)
}

export function close(): void {
  if (!activeSession) return
  finish(activeSession, { type: 'close', payload: { reason: 'programmatic' } })
}
