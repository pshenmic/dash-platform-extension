import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { WalletType } from '../../types'
import type { OutletContext } from '../types'

export interface WalletCapabilities {
  /** Core (L1) balance, addresses and transactions. */
  hasCoreLayer: boolean
  /** Platform and shielded addresses. */
  hasAddressLayer: boolean
}

/**
 * What the current wallet can actually do. Every address layer is derived from
 * the seed, so a keystore wallet has none of them and holds only its imported
 * identities.
 */
export function useWalletCapabilities (): WalletCapabilities {
  const { allWallets, currentWallet } = useOutletContext<OutletContext>()

  return useMemo((): WalletCapabilities => {
    const walletType = (allWallets ?? []).find(wallet => wallet.walletId === currentWallet)?.type ?? null
    // An unknown type means the wallet list is still loading. Assuming the full
    // wallet keeps a seedphrase one from flashing its Core card as unavailable.
    const seedBacked = walletType == null || walletType === WalletType.seedphrase

    return { hasCoreLayer: seedBacked, hasAddressLayer: seedBacked }
  }, [allWallets, currentWallet])
}
