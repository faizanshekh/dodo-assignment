export type CheckoutValues = {
  email: string
  cardNumber: string
  expiry: string
  cvc: string
}

export type CheckoutField = keyof CheckoutValues
export type FormErrors = Partial<Record<CheckoutField, string>>

export function normalizeDigits(value: string, maxLength: number): string {
  return value.replace(/\D/g, '').slice(0, maxLength)
}

export function formatCardNumber(raw: string): string {
  return raw.match(/.{1,4}/g)?.join(' ') ?? ''
}

export function formatExpiry(raw: string): string {
  return raw.length <= 2 ? raw : `${raw.slice(0, 2)} / ${raw.slice(2)}`
}

export function validateField(
  field: CheckoutField,
  value: string,
  now: Date = new Date(),
): string | undefined {
  switch (field) {
    case 'email': {
      const email = value.trim()
      if (!email) return 'Enter your email address.'
      if (!/^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(email)) {
        return 'Enter a valid email address.'
      }
      return undefined
    }
    case 'cardNumber':
      if (!value) return 'Enter your card number.'
      return /^\d{16}$/.test(value) ? undefined : 'Enter a 16-digit card number.'
    case 'expiry': {
      if (!value) return 'Enter the expiry date.'
      if (!/^\d{4}$/.test(value)) return 'Enter the expiry as MM / YY.'

      const month = Number(value.slice(0, 2))
      const year = 2000 + Number(value.slice(2))
      if (month < 1 || month > 12) return 'Enter a month from 01 to 12.'
      if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) {
        return 'Your card has expired.'
      }
      return undefined
    }
    case 'cvc':
      if (!value) return 'Enter your CVC.'
      return /^\d{3}$/.test(value) ? undefined : 'Enter a 3-digit CVC.'
  }
}

export function validateForm(
  values: CheckoutValues,
  now: Date = new Date(),
): FormErrors {
  const errors: FormErrors = {}

  for (const field of Object.keys(values) as CheckoutField[]) {
    const error = validateField(field, values[field], now)
    if (error) errors[field] = error
  }

  return errors
}
