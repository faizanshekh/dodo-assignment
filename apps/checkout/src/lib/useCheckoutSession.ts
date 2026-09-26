import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CHANNEL,
  VERSION,
  isInitMessage,
  matchesPeer,
} from '../../../../packages/sdk/src/protocol.ts'
import type { CheckoutMessage } from '../../../../packages/sdk/src/protocol.ts'
import { readEmbeddingContext } from './embedding.ts'
import { getProduct } from './products.ts'
import type { Product } from './products.ts'

type CheckoutSession =
  | { status: 'loading' }
  | { status: 'ready'; product: Product }
  | { status: 'error'; message: string }

type TerminalMessage = Exclude<CheckoutMessage, { type: 'CHECKOUT_READY' }>

export function useCheckoutSession() {
  const [context] = useState(() => readEmbeddingContext(
    window.location.search,
    window.parent !== window,
  ))
  const [session, setSession] = useState<CheckoutSession>(() => {
    if (context.kind === 'standalone') {
      return { status: 'ready', product: getProduct('prod_123')! }
    }
    if (context.kind === 'invalid') {
      return { status: 'error', message: 'This checkout link is invalid. Please return to the merchant and try again.' }
    }
    return { status: 'loading' }
  })
  const initialized = useRef(false)
  const terminalSent = useRef(false)

  const sendTerminal = useCallback((message: TerminalMessage) => {
    if (context.kind !== 'embedded' || terminalSent.current) return
    terminalSent.current = true
    window.parent.postMessage(message, context.parentOrigin)
  }, [context])

  useEffect(() => {
    if (context.kind !== 'embedded') return

    function handleMessage(event: MessageEvent<unknown>) {
      if (context.kind !== 'embedded' || initialized.current || terminalSent.current) return
      if (!matchesPeer(event, context.parentOrigin, window.parent)) return
      if (!isInitMessage(event.data) || event.data.checkoutId !== context.checkoutId) return

      initialized.current = true
      const product = getProduct(event.data.payload.productId)
      if (product) {
        setSession({ status: 'ready', product })
      } else {
        const message = 'This demo product could not be found. Please return to the merchant.'
        setSession({ status: 'error', message })
        sendTerminal({
          channel: CHANNEL,
          version: VERSION,
          checkoutId: context.checkoutId,
          type: 'CHECKOUT_ERROR',
          payload: { code: 'PRODUCT_NOT_FOUND', message },
        })
      }
    }

    window.addEventListener('message', handleMessage)
    // Attach the INIT listener before telling the parent we are ready.
    window.parent.postMessage({
      channel: CHANNEL,
      version: VERSION,
      checkoutId: context.checkoutId,
      type: 'CHECKOUT_READY',
    }, context.parentOrigin)

    return () => window.removeEventListener('message', handleMessage)
  }, [context, sendTerminal])

  const requestClose = useCallback(() => {
    if (context.kind !== 'embedded') return
    sendTerminal({
      channel: CHANNEL,
      version: VERSION,
      checkoutId: context.checkoutId,
      type: 'CHECKOUT_CLOSE',
      payload: { reason: 'user' },
    })
  }, [context, sendTerminal])

  const notifySuccess = useCallback((sessionId: string) => {
    if (context.kind !== 'embedded' || !initialized.current) return
    sendTerminal({
      channel: CHANNEL,
      version: VERSION,
      checkoutId: context.checkoutId,
      type: 'CHECKOUT_SUCCESS',
      payload: { sessionId },
    })
  }, [context, sendTerminal])

  return { session, embedded: context.kind === 'embedded', requestClose, notifySuccess }
}
