import { useCallback, useEffect, useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useAsyncState, usePlatformExplorerClient, useSdk } from '../../hooks'
import type { TransactionData, TokenData } from '../../hooks/usePlatformExplorerApi'
import type { NameData } from '../../components/names'
import type { OutletContext } from '../../types/OutletContext'
import { fetchNames } from '../../../utils'

export function useIdentityHomeData (identifier: string): {
  balanceState: { data: bigint | null, loading: boolean, error: string | null }
  transactionsState: { data: TransactionData[] | null, loading: boolean, error: string | null }
  tokensState: { data: TokenData[] | null, loading: boolean, error: string | null }
  namesState: { data: NameData[] | null, loading: boolean, error: string | null }
  rateState: { data: number | null, loading: boolean, error: string | null }
  refreshData: () => Promise<void>
} {
  const sdk = useSdk()
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
    if (identifier === '' || currentNetwork == null) return
    if (sdk.getNetwork() !== currentNetwork) return
    if (walletNetwork != null && walletNetwork !== currentNetwork) return

    const network = currentNetwork

    loadBalance(async () => await sdk.identities.getIdentityBalance(identifier))
      .catch(e => console.log('loadBalance error', e))
    loadTransactions(async () => await platformExplorerClient.fetchTransactions(identifier, network, 'desc'))
      .catch(e => console.log('loadTransactions error', e))
    loadTokens(async () => await platformExplorerClient.fetchTokens(identifier, network, 100, 1))
      .catch(e => console.log('loadTokens error', e))
    loadNames(async () => await fetchNames(sdk, platformExplorerClient, identifier, network))
      .catch(e => console.log('loadNames error', e))
  }, [
    identifier,
    currentNetwork,
    walletNetwork,
    sdk,
    platformExplorerClient,
    loadBalance,
    loadTransactions,
    loadTokens,
    loadNames
  ])

  useEffect(() => {
    refreshData().catch(e => console.log('load identity home error', e))
  }, [refreshData])

  useEffect(() => {
    if (currentNetwork == null) return
    loadRate(async () => await platformExplorerClient.fetchRate(currentNetwork))
      .catch(e => console.log('loadRate error', e))
  }, [currentNetwork, platformExplorerClient, loadRate])

  return { balanceState, transactionsState, tokensState, namesState, rateState, refreshData }
}
