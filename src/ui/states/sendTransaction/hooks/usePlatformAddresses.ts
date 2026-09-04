import { useEffect, useState } from 'react'
import { WalletType } from '../../../../types'
import { useExtensionAPI } from '../../../hooks'
import type { PlatformAddressEntry } from '../types'

interface UsePlatformAddressesResult {
  platformAddresses: PlatformAddressEntry[]
  platformBalances: Map<string, bigint>
}

/**
 * Loads the wallet's platform addresses (seedphrase wallets only) and their
 * balances. Returns empty collections for non-seedphrase wallets.
 */
export function usePlatformAddresses (
  walletType: string | null,
  currentWallet: string | null | undefined
): UsePlatformAddressesResult {
  const extensionAPI = useExtensionAPI()
  const [platformAddresses, setPlatformAddresses] = useState<PlatformAddressEntry[]>([])
  const [platformBalances, setPlatformBalances] = useState<Map<string, bigint>>(new Map())

  useEffect(() => {
    if (walletType !== WalletType.seedphrase) {
      setPlatformAddresses([])
      setPlatformBalances(new Map())
      return
    }

    let cancelled = false

    const load = async (): Promise<void> => {
      const addresses = await extensionAPI.listPlatformAddresses()
      if (cancelled) return
      setPlatformAddresses(addresses)

      if (addresses.length === 0) return

      try {
        const infos = await extensionAPI.getPlatformAddressesInfos(addresses.map(entry => entry.address))
        if (cancelled) return
        setPlatformBalances(new Map(infos.map(info => [info.address, BigInt(info.balance)])))
      } catch (err) {
        console.log('Failed to load platform address balances:', err)
      }
    }

    void load().catch(e => console.log('loadPlatformAddresses error:', e))

    return () => {
      cancelled = true
    }
  }, [walletType, currentWallet, extensionAPI])

  return { platformAddresses, platformBalances }
}
