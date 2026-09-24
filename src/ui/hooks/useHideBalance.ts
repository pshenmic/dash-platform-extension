import { useCallback, useEffect, useState } from 'react'
import { useExtensionAPI } from './useExtensionAPI'

export interface UseHideBalanceResult {
  hideBalance: boolean
  toggleHide: () => void
  refresh: () => void
}

/** Shared "hide balance" setting, used by every screen with a balance block. */
export function useHideBalance (): UseHideBalanceResult {
  const extensionAPI = useExtensionAPI()
  const [hideBalance, setHideBalance] = useState(false)

  useEffect(() => {
    let cancelled = false

    extensionAPI.getSettings()
      .then(settings => {
        if (!cancelled) setHideBalance(settings.hideBalance)
      })
      .catch(e => console.log('getSettings error', e))

    return () => {
      cancelled = true
    }
  }, [extensionAPI])

  const toggleHide = useCallback((): void => {
    setHideBalance(previous => {
      const next = !previous
      extensionAPI.setSettings(next).catch(e => console.log('setSettings error', e))
      return next
    })
  }, [extensionAPI])

  const refresh = useCallback((): void => {
    extensionAPI.getIdentities().catch(e => console.log('refresh identities error', e))
  }, [extensionAPI])

  return { hideBalance, toggleHide, refresh }
}
