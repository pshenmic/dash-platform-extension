import { useMemo, type MutableRefObject } from 'react'
import type { Identity, NetworkType, PlatformExplorerClient } from '../../../types'
import { createIdentitySource } from './sources/identitySource'
import { createMockSource } from './sources/mockSource'
import { mergeSources } from './sources/mergeSources'
import { buildCoreMockRows } from './mock'
import type { TransactionsScope, TransactionsSource } from './types'

interface UseTransactionsSourceOptions {
  scope: TransactionsScope
  identityId: string | null
  identities: Identity[]
  network: NetworkType | null
  walletId: string | null
  client: PlatformExplorerClient
  rateRef: MutableRefObject<number | null>
}

/**
 * Builds the source for the active scope. The memo key covers everything that
 * must invalidate loaded pages: scope, network and wallet.
 */
export function useTransactionsSource ({
  scope,
  identityId,
  identities,
  network,
  walletId,
  client,
  rateRef
}: UseTransactionsSourceOptions): TransactionsSource | null {
  const identifiers = identities.map(identity => identity.identifier).join(',')

  return useMemo(() => {
    if (network == null) return null

    const key = `${network}|${walletId ?? ''}|${scope}|${identityId ?? ''}|${identifiers}`
    const coreSource = (): TransactionsSource => createMockSource(`core:${key}`, buildCoreMockRows())
    const platformSources = (): TransactionsSource[] => identifiers === ''
      ? []
      : identifiers.split(',').map(identifier => createIdentitySource({ client, identifier, network, rateRef }))

    if (scope === 'core') return coreSource()

    if (scope === 'identity') {
      if (identityId == null || identityId === '') return null

      return createIdentitySource({ client, identifier: identityId, network, rateRef })
    }

    if (scope === 'platform') return mergeSources(key, platformSources())

    return mergeSources(key, [...platformSources(), coreSource()])
    // rateRef and client are stable singletons, intentionally not in the key.
  }, [scope, identityId, identifiers, network, walletId, client, rateRef])
}
