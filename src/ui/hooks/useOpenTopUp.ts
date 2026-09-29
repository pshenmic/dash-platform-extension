import { useCallback, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import type { OutletContext } from '../types'
import {
  findOpenExtensionTab,
  focusExtensionTab,
  isTabView,
  openExtensionTab,
  type OpenExtensionTab
} from '../utils/extensionTab'
import { buildTopUpUrl } from '../utils/topUpTabUrl'
import { useWalletCapabilities } from './useWalletCapabilities'

export interface UseOpenTopUpResult {
  /** Top-up derives its funding key from the seed, which keystore wallets do not have. */
  canTopUp: boolean
  openTopUp: (identityId: string | null) => void
  busyTab: OpenExtensionTab | null
  dismissBusyTab: () => void
  focusBusyTab: () => void
}

/**
 * Opens identity top-up in its own browser tab. The flow waits for an on-chain
 * deposit, so it must outlive the popup; the tab registry holds one top-up tab,
 * and a second one would lose track of the first.
 */
export function useOpenTopUp (): UseOpenTopUpResult {
  const navigate = useNavigate()
  const { currentWallet, currentNetwork } = useOutletContext<OutletContext>()
  const { hasCoreLayer } = useWalletCapabilities()
  const [busyTab, setBusyTab] = useState<OpenExtensionTab | null>(null)

  const openTopUp = useCallback((identityId: string | null): void => {
    const scope = {
      identityId,
      walletId: currentWallet,
      network: currentNetwork
    }
    const url = buildTopUpUrl(scope, 1)

    // Already in a tab: there is nothing to outlive, so stay in place.
    if (isTabView()) {
      void navigate(url)
      return
    }

    const open = async (): Promise<void> => {
      const openTab = await findOpenExtensionTab('topup')

      if (openTab != null) {
        setBusyTab(openTab)
        return
      }

      await openExtensionTab('topup', url, scope)
    }

    open().catch(e => console.log('openTopUp error', e))
  }, [navigate, currentWallet, currentNetwork])

  const dismissBusyTab = useCallback((): void => {
    setBusyTab(null)
  }, [])

  const focusBusyTab = useCallback((): void => {
    const tabId = busyTab?.tabId
    setBusyTab(null)

    if (tabId != null) void focusExtensionTab(tabId)
  }, [busyTab])

  return { canTopUp: hasCoreLayer, openTopUp, busyTab, dismissBusyTab, focusBusyTab }
}
