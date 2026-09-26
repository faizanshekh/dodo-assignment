import { isHttpOrigin } from '../../../../packages/sdk/src/protocol.ts'

export type EmbeddingContext =
  | { kind: 'standalone' }
  | { kind: 'embedded'; checkoutId: string; parentOrigin: string }
  | { kind: 'invalid' }

export function readEmbeddingContext(search: string, embedded: boolean): EmbeddingContext {
  if (!embedded) return { kind: 'standalone' }

  const params = new URLSearchParams(search)
  const checkoutIds = params.getAll('checkoutId')
  const parentOrigins = params.getAll('parentOrigin')
  if (checkoutIds.length !== 1 || parentOrigins.length !== 1) return { kind: 'invalid' }

  const checkoutId = checkoutIds[0]
  const parentOrigin = parentOrigins[0]
  if (!checkoutId.trim() || !isHttpOrigin(parentOrigin)) return { kind: 'invalid' }

  return { kind: 'embedded', checkoutId, parentOrigin }
}
