import { transactionsSourceKey, transactionSortKey, type TransactionsScope } from './types'

const base = {
  network: 'testnet',
  walletId: 'wallet-a',
  identityId: null as string | null,
  identifiers: ['id-1', 'id-2']
}

const SCOPES: TransactionsScope[] = ['all', 'core', 'platform', 'identity']

describe('transactionsSourceKey', () => {
  // Regression: an identity scope used to key on the identifier alone, so
  // switching wallets kept the previous wallet's transactions on screen.
  it.each(SCOPES)('changes when the wallet changes (scope %s)', (scope) => {
    const parts = { ...base, scope, identityId: scope === 'identity' ? 'id-1' : null }

    expect(transactionsSourceKey(parts)).not.toBe(
      transactionsSourceKey({ ...parts, walletId: 'wallet-b' })
    )
  })

  it.each(SCOPES)('changes when the network changes (scope %s)', (scope) => {
    const parts = { ...base, scope, identityId: scope === 'identity' ? 'id-1' : null }

    expect(transactionsSourceKey(parts)).not.toBe(
      transactionsSourceKey({ ...parts, network: 'mainnet' })
    )
  })

  it('changes when the wallet identities change', () => {
    const parts = { ...base, scope: 'platform' as const }

    expect(transactionsSourceKey(parts)).not.toBe(
      transactionsSourceKey({ ...parts, identifiers: ['id-1'] })
    )
  })

  it('changes when narrowing to an identity', () => {
    expect(transactionsSourceKey({ ...base, scope: 'platform' })).not.toBe(
      transactionsSourceKey({ ...base, scope: 'identity', identityId: 'id-1' })
    )
  })

  it('stays stable for unchanged inputs', () => {
    const parts = { ...base, scope: 'platform' as const }

    expect(transactionsSourceKey(parts)).toBe(transactionsSourceKey({ ...parts }))
  })
})

describe('transactionSortKey', () => {
  it('sorts missing and unparsable timestamps last', () => {
    const row = (timestamp: string | null): any => ({ timestamp })

    expect(transactionSortKey(row(null))).toBe(Number.NEGATIVE_INFINITY)
    expect(transactionSortKey(row(''))).toBe(Number.NEGATIVE_INFINITY)
    expect(transactionSortKey(row('not a date'))).toBe(Number.NEGATIVE_INFINITY)
    expect(transactionSortKey(row('2026-09-09T10:00:00Z'))).toBe(Date.parse('2026-09-09T10:00:00Z'))
  })
})
