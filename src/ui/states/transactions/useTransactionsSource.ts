import { useMemo } from 'react'
import type { CoreExplorerClient, Identity, NetworkType, PlatformExplorerClient } from '../../../types'
import { createIdentitySource } from './sources/identitySource'
import { createCoreSource } from './sources/coreSource'
import { mergeSources } from './sources/mergeSources'
import { transactionsSourceKey, type TransactionsScope, type TransactionsSource } from './types'

interface UseTransactionsSourceOptions {
  scope: TransactionsScope
  identityId: string | null
  identities: Identity[]
  network: NetworkType | null
  walletId: string | null
  client: PlatformExplorerClient
  coreClient: CoreExplorerClient
  /** Null while the wallet's Core addresses are still loading. */
  coreAddresses: string[] | null
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
  coreClient,
  coreAddresses
}: UseTransactionsSourceOptions): TransactionsSource | null {
  const identifiers = identities.map(identity => identity.identifier).join(',')
  const coreAddressList = coreAddresses?.join(',') ?? null

  return useMemo(() => {
    if (network == null) return null

    const key = transactionsSourceKey({
      scope,
      identityId,
      network,
      walletId,
      identifiers: identifiers === '' ? [] : identifiers.split(',')
    })
    const coreSource = (): TransactionsSource | null => {
      if (coreAddressList == null) return null

      const addresses = coreAddressList === '' ? [] : coreAddressList.split(',')

      return createCoreSource(`core:${key}`, { client: coreClient, addresses, network })
    }
    const platformSources = (): TransactionsSource[] => identifiers === ''
      ? []
      : identifiers.split(',').map(identifier => createIdentitySource({ client, identifier, network }))

    const build = (): TransactionsSource | null => {
      if (scope === 'core') return coreSource()

      if (scope === 'identity') {
        if (identityId == null || identityId === '') return null

        return createIdentitySource({ client, identifier: identityId, network })
      }

      if (scope === 'platform') return mergeSources(key, platformSources())

      const core = coreSource()
      if (core == null) return null

      return mergeSources(key, [...platformSources(), core])
    }

    const built = build()

    // Stamped here so no branch can hand back a source keyed on less than the
    // full scope. Consumers reset their loaded pages on this key alone.
    return built == null ? null : { ...built, key }
    // Both clients are stable singletons, intentionally not in the key.
  }, [scope, identityId, identifiers, network, walletId, client, coreClient, coreAddressList])
}
