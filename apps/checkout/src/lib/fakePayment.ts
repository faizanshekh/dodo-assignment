export type PaymentResult =
  | { status: 'success' }
  | { status: 'declined'; reason: 'card_declined' | 'unsupported_card'; message: string }
  | { status: 'retryable_error'; message: string }

export type PaymentState =
  | { status: 'idle' }
  | { status: 'processing' }
  | PaymentResult

export function createFakePaymentProcessor(): (cardNumber: string) => Promise<PaymentResult> {
  let retryableCardAttempts = 0

  return async (cardNumber) => {
    // Attempts belong to this checkout instance and only count the retry test card.
    const retryableAttempt = cardNumber === '4000000000000341'
      ? ++retryableCardAttempts
      : 0

    await new Promise<void>((resolve) => setTimeout(resolve, 1200))

    switch (cardNumber) {
      case '4242424242424242':
        return { status: 'success' }
      case '4000000000000002':
        return {
          status: 'declined',
          reason: 'card_declined',
          message: 'Your card was declined. Try another card.',
        }
      case '4000000000000341':
        return retryableAttempt === 1
          ? {
              status: 'retryable_error',
              message: 'Something went wrong with this demo payment. No charge was made. Please try again.',
            }
          : { status: 'success' }
      default:
        return {
          status: 'declined',
          reason: 'unsupported_card',
          message: 'This test card is not supported by the demo. Try 4242 4242 4242 4242. No charge was made.',
        }
    }
  }
}
