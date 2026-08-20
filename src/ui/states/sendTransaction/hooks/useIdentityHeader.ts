import React, { useEffect } from 'react'
import IdentityHeaderBadge from '../../../components/identity/IdentityHeaderBadge'
import type { NetworkType } from '../../../../types'
import type { WalletAccountInfo } from '../../../../types/messages/response/GetAllWalletsResponse'

interface UseIdentityHeaderParams {
  currentIdentity: string | null
  currentWallet: string | null
  allWallets: WalletAccountInfo[]
  currentNetwork: NetworkType | null
  setHeaderComponent: (component: React.ReactNode) => void
}

// Label of the current wallet, falling back to its position in the network list.
function getWalletName (
  currentWallet: string | null,
  allWallets: WalletAccountInfo[],
  currentNetwork: NetworkType | null
): string {
  if (currentWallet == null || allWallets == null || allWallets.length === 0) return 'Wallet'

  const availableWallets = allWallets.filter(wallet => wallet.network === currentNetwork)
  const currentWalletData = availableWallets.find(wallet => wallet.walletId === currentWallet)

  if (currentWalletData == null) return 'Wallet'

  const currentWalletIndex = availableWallets.findIndex(wallet => wallet.walletId === currentWallet)
  return currentWalletData.label ?? `Wallet_${currentWalletIndex + 1}`
}

/**
 * Shows the identity + wallet badge in the screen header, clearing it on unmount.
 */
export function useIdentityHeader ({
  currentIdentity,
  currentWallet,
  allWallets,
  currentNetwork,
  setHeaderComponent
}: UseIdentityHeaderParams): void {
  useEffect(() => {
    if (currentIdentity !== null) {
      setHeaderComponent(
        React.createElement(IdentityHeaderBadge, {
          identity: currentIdentity,
          walletName: getWalletName(currentWallet, allWallets, currentNetwork)
        })
      )
    }

    return () => {
      setHeaderComponent(null)
    }
  }, [currentIdentity, currentWallet, allWallets, currentNetwork, setHeaderComponent])
}
