import { useOutletContext } from 'react-router-dom'
import type { OutletContext } from '../types/OutletContext'

// Display name of a wallet, falling back to its position in the list.
// Pass a walletId to name that wallet instead of the current one.
export const useWalletName = (walletId?: string | null): string => {
  const context = useOutletContext<OutletContext | null>()
  const { currentWallet, allWallets, currentNetwork } = context ?? {}
  const targetWallet = walletId ?? currentWallet

  if (targetWallet == null || allWallets == null || allWallets.length === 0) return 'Wallet'

  const available = allWallets.filter(wallet => wallet.network === currentNetwork)
  const current = available.find(wallet => wallet.walletId === targetWallet)

  if (current == null) return 'Wallet'

  const index = available.findIndex(wallet => wallet.walletId === targetWallet)

  return current.label ?? `Wallet_${index + 1}`
}
