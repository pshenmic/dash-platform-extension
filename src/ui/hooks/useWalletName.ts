import { useOutletContext } from 'react-router-dom'
import type { OutletContext } from '../types/OutletContext'

// Display name of the current wallet, falling back to its position in the list
export const useWalletName = (): string => {
  const context = useOutletContext<OutletContext | null>()
  const { currentWallet, allWallets, currentNetwork } = context ?? {}

  if (currentWallet == null || allWallets == null || allWallets.length === 0) return 'Wallet'

  const available = allWallets.filter(wallet => wallet.network === currentNetwork)
  const current = available.find(wallet => wallet.walletId === currentWallet)

  if (current == null) return 'Wallet'

  const index = available.findIndex(wallet => wallet.walletId === currentWallet)

  return current.label ?? `Wallet_${index + 1}`
}
