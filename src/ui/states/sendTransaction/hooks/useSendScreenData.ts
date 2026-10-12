import { useEffect, useState } from 'react'
import { useAsyncState, useSdk, usePlatformExplorerClient } from '../../../hooks'
import type { AsyncState } from '../../../hooks'
import type { NetworkType, TokenData } from '../../../../types'

interface UseSendScreenDataResult {
  balance: bigint | null
  rate: number | null
  tokensState: AsyncState<TokenData[]>
}

// Balance, tokens and the exchange rate of the sending identity; null identity loads the rate only.
export function useSendScreenData (identityId: string | null, network: NetworkType): UseSendScreenDataResult {
  const sdk = useSdk()
  const platformExplorerClient = usePlatformExplorerClient()
  const [balance, setBalance] = useState<bigint | null>(null)
  const [rate, setRate] = useState<number | null>(null)
  const [tokensState, loadTokens] = useAsyncState<TokenData[]>()

  useEffect(() => {
    setBalance(null)

    if (identityId != null) {
      sdk.identities.getIdentityBalance(identityId)
        .then(setBalance)
        .catch(e => console.error('Failed to load balance:', e))
    }

    platformExplorerClient.fetchRate(network)
      .then(setRate)
      .catch(e => {
        console.log('Failed to load exchange rate:', e)
        setRate(null)
      })
  }, [identityId, sdk, network, platformExplorerClient])

  // Without an identity the list resolves empty, so the screen still leaves the loading state.
  useEffect(() => {
    loadTokens(async () => identityId == null ? [] : await platformExplorerClient.fetchTokens(identityId, network, 100, 1))
      .catch(e => console.log('loadTokens error:', e))
  }, [identityId, network, platformExplorerClient, loadTokens])

  return { balance, rate, tokensState }
}
