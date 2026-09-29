import type { TransactionsScope } from '../states/transactions/types'

// Scope lives in the URL so the screen survives a reload and stays shareable.
export function transactionsPath (scope: TransactionsScope = 'all', identityId?: string): string {
  const params = new URLSearchParams({ scope })

  if (scope === 'identity' && identityId != null && identityId !== '') {
    params.set('id', identityId)
  }

  return `/transactions?${params.toString()}`
}

export function parseTransactionsScope (value: string | null): TransactionsScope {
  if (value === 'core' || value === 'platform' || value === 'identity') return value

  return 'all'
}
