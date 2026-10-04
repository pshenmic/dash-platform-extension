import { useCallback, useEffect, useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useAsyncState, usePlatformExplorerClient } from '../../hooks'
import type { TransactionData, TokenData } from '../../hooks/usePlatformExplorerApi'
import type { NameData } from '../../components/names'
import type { OutletContext } from '../../types/OutletContext'
import { fetchNames } from '../../../utils'
import { getSdkNetwork, getSdkPromise } from '../../../utils/sdkLoader'

export function useIdentityHomeData (identifier: string): {
  balanceState: { data: bigint | null, loading: boolean, error: string | null }
  transactionsState: { data: TransactionData[] | null, loading: boolean, error: string | null }
  tokensState: { data: TokenData[] | null, loading: boolean, error: string | null }
  namesState: { data: NameData[] | null, loading: boolean, error: string | null }
  rateState: { data: number | null, loading: boolean, error: string | null }
  refreshData: () => Promise<void>
} {
  const platformExplorerClient = usePlatformExplorerClient()
  const { currentNetwork, currentWallet, allWallets } = useOutletContext<OutletContext>()
  const [balanceState, loadBalance] = useAsyncState<bigint>()
  const [transactionsState, loadTransactions] = useAsyncState<TransactionData[]>()
  const [tokensState, loadTokens] = useAsyncState<TokenData[]>()
  const [namesState, loadNames] = useAsyncState<NameData[]>()
  const [rateState, loadRate] = useAsyncState<number>()

  // Depending on the array itself restarts every request on each loadWallets();
  // only the active wallet's network actually gates the fetches.
  const walletNetwork = useMemo(
    () => allWallets.find(item => item.walletId === currentWallet)?.network ?? null,
    [allWallets, currentWallet]
  )

  const refreshData = useCallback(async (): Promise<void> => {
    if (currentNetwork == null) return

    const network = currentNetwork

    loadRate(async () => await platformExplorerClient.fetchRate(network))
      .catch(e => console.log('loadRate error', e))

    if (identifier === '') return
    if (getSdkNetwork() !== currentNetwork) return
    if (walletNetwork != null && walletNetwork !== currentNetwork) return

    // The SDK is awaited per request instead of via useSdk, which would suspend the whole page until it loads.
    loadBalance(async () => await (await getSdkPromise()).identities.getIdentityBalance(identifier))
      .catch(e => console.log('loadBalance error', e))
    loadTransactions(async () => await platformExplorerClient.fetchTransactions(identifier, network, 'desc'))
      .catch(e => console.log('loadTransactions error', e))
    loadTokens(async () => await platformExplorerClient.fetchTokens(identifier, network, 100, 1))
      .catch(e => console.log('loadTokens error', e))
    loadNames(async () => await fetchNames(await getSdkPromise(), platformExplorerClient, identifier, network))
      .catch(e => console.log('loadNames error', e))
  }, [
    identifier,
    currentNetwork,
    walletNetwork,
    platformExplorerClient,
    loadBalance,
    loadTransactions,
    loadTokens,
    loadNames,
    loadRate
  ])

  useEffect(() => {
    refreshData().catch(e => console.log('load identity home error', e))
  }, [refreshData])

  return { balanceState, transactionsState, tokensState, namesState, rateState, refreshData }
}
