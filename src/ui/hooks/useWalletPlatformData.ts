import { useCallback, useEffect, useRef } from 'react'
import { usePlatformExplorerClient } from './usePlatformExplorerClient'
import { useAsyncState } from './useAsyncState'
import { promisePool } from '../../utils/promisePool'
import type { Identity, NetworkType } from '../../types'

const IDENTITY_FETCH_CONCURRENCY = 4

export interface WalletIdentityData {
  identifier: string
  label: string | null
  credits: string | null
  txCount: number | null
  transferCount: number | null
  documentCount: number | null
  dataContractCount: number | null
  names: string[]
}

export interface UseWalletPlatformDataResult {
  identities: WalletIdentityData[]
  totalCredits: bigint
  totalTxCount: number
  totalTransferCount: number
  nameCount: number
  lastName: string | null
  loading: boolean
  error: string | null
  reload: () => void
}

const aliasName = (alias: any): string | null => {
  const name = alias?.alias ?? alias?.name
  return typeof name === 'string' ? name : null
}

/** Per-identity platform data for the whole wallet, plus the sums the dashboard shows. */
export function useWalletPlatformData (
  identities: Identity[],
  network?: NetworkType | null
): UseWalletPlatformDataResult {
  const platformExplorerClient = usePlatformExplorerClient()
  const [state, execute, , reset] = useAsyncState<WalletIdentityData[]>(null)

  // The identity array is a new object every render, so the load keys off the
  // joined identifiers and reads the current list through a ref.
  const identifiers = identities.map(identity => identity.identifier).join(',')
  const identitiesRef = useRef(identities)
  identitiesRef.current = identities

  const load = useCallback((keepData: boolean = false): void => {
    const currentIdentities = identitiesRef.current

    if (currentIdentities.length === 0) {
      reset()
      return
    }

    const tasks = currentIdentities.map(identity => async (): Promise<WalletIdentityData> => {
      const empty: WalletIdentityData = {
        identifier: identity.identifier,
        label: identity.label,
        credits: null,
        txCount: null,
        transferCount: null,
        documentCount: null,
        dataContractCount: null,
        names: []
      }

      const apiData = await platformExplorerClient
        .fetchIdentity(identity.identifier, network ?? 'testnet')
        .catch(() => null)

      if (apiData == null) return empty

      return {
        ...empty,
        credits: apiData.balance,
        txCount: apiData.totalTxs,
        transferCount: apiData.totalTransfers,
        documentCount: apiData.totalDocuments,
        dataContractCount: apiData.totalDataContracts,
        names: (apiData.aliases ?? []).map(aliasName).filter((name): name is string => name != null)
      }
    })

    void execute(async () => await promisePool(tasks, IDENTITY_FETCH_CONCURRENCY), { keepData })
  }, [platformExplorerClient, network, identifiers, execute, reset])

  useEffect(() => { load() }, [load])

  const reload = useCallback((): void => { load(true) }, [load])

  const data = state.data ?? []

  const totalCredits = data.reduce((sum, item) => sum + BigInt(item.credits ?? '0'), 0n)
  const totalTxCount = data.reduce((sum, item) => sum + (item.txCount ?? 0), 0)
  const totalTransferCount = data.reduce((sum, item) => sum + (item.transferCount ?? 0), 0)
  const names = data.flatMap(item => item.names)

  return {
    identities: data,
    totalCredits,
    totalTxCount,
    totalTransferCount,
    nameCount: names.length,
    lastName: names[names.length - 1] ?? null,
    loading: state.loading,
    error: state.error,
    reload
  }
}
