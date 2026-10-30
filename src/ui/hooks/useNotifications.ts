import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useExtensionAPI } from './useExtensionAPI'
import { unfinishedOperations } from '../../utils'
import type { AppNotification } from '../types'

export interface UseNotificationsResult {
  notifications: AppNotification[]
  reload: () => void
}

interface NotificationsParams {
  // False for wallets with no Core layer, which have no unfinished operations.
  enabled: boolean
  walletId: string | null
  network: string | null
}

/**
 * Header notifications: unfinished Core operations of the current wallet.
 * Reloads on a wallet or network switch and on every screen change, so a finished transfer drops out once the wizard closes.
 */
export function useNotifications ({ enabled, walletId, network }: NotificationsParams): UseNotificationsResult {
  const extensionAPI = useExtensionAPI()
  const { pathname } = useLocation()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const requestRef = useRef(0)

  // The wallet and network come from the content-script; they stay in the deps so switching refetches.
  const reload = useCallback((): void => {
    const request = ++requestRef.current
    if (!enabled) {
      setNotifications([])
      return
    }

    extensionAPI.listPendingAssetLocks()
      .then(locks => {
        if (request !== requestRef.current) return
        setNotifications(unfinishedOperations(locks).map(operation => ({ type: 'unfinishedOperation', id: operation.fundingTxid, operation })))
      })
      .catch(e => console.log('listPendingAssetLocks error', e))
  }, [extensionAPI, enabled, walletId, network])

  useEffect(() => { reload() }, [reload, pathname])

  return { notifications, reload }
}
