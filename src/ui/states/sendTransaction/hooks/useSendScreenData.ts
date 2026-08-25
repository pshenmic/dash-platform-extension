import { useEffect, useState } from 'react'
import { useAsyncState, useSdk, usePlatformExplorerClient } from '../../../hooks'
import type { AsyncState } from '../../../hooks'
import type { NetworkType, TokenData } from '../../../../types'

interface UseSendScreenDataParams {
  senderIdentity: string | null
  currentIdentity: string | null
  currentNetwork: NetworkType | null
}

interface UseSendScreenDataResult {
  balance: bigint | null
  rate: number | null
  tokensState: AsyncState<TokenData[]>
}

/**
 * Screen data for the send flow: sender balance, exchange rate and token list.
 */
export function useSendScreenData ({
  senderIdentity,
  currentIdentity,
  currentNetwork
}: UseSendScreenDataParams): UseSendScreenDataResult {
  const sdk = useSdk()
  const platformExplorerClient = usePlatformExplorerClient()
  const [balance, setBalance] = useState<bigint | null>(null)
  const [rate, setRate] = useState<number | null>(null)
  const [tokensState, loadTokens] = useAsyncState<TokenData[]>()

  // Load balance and exchange rate
  useEffect(() => {
    const loadBalance = async (): Promise<void> => {
      if (senderIdentity !== null && senderIdentity !== undefined) {
        try {
          const identityBalance = await sdk.identities.getIdentityBalance(senderIdentity)
          setBalance(identityBalance)
        } catch (err) {
          console.error('Failed to load balance:', err)
        }
      }
    }

    const loadRate = async (): Promise<void> => {
      try {
        const rate = await platformExplorerClient.fetchRate(currentNetwork ?? 'testnet')
        setRate(rate)
      } catch (err) {
        console.log('Failed to load exchange rate:', err)
        setRate(null)
      }
    }

    void loadBalance().catch(e => console.log('loadBalance error:', e))
    void loadRate().catch(e => console.log('loadRate error:', e))
  }, [senderIdentity, sdk, currentNetwork, platformExplorerClient])

  // Load tokens for the current identity
  useEffect(() => {
    if (currentIdentity === null) return

    loadTokens(async () => {
      return await platformExplorerClient.fetchTokens(currentIdentity, currentNetwork as NetworkType, 100, 1)
    }).catch(e => console.log('loadTokens error:', e))
  }, [currentIdentity, currentNetwork, platformExplorerClient, loadTokens])

  return { balance, rate, tokensState }
}
