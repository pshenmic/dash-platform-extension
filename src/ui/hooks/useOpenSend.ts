import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { locationReturnState } from '../types'
import { sendPath } from '../utils/sendPath'
import type { SendContinueState } from '../utils/sendPath'
import type { SendScope } from '../states/sendTransaction/types'

/** Opens the send screen in the given scope, remembering the origin screen. */
export function useOpenSend (scope: SendScope = 'all', identityId?: string): () => void {
  const navigate = useNavigate()
  const location = useLocation()

  return useCallback((): void => {
    void navigate(sendPath(scope, identityId), {
      state: locationReturnState(`${location.pathname}${location.search}`)
    })
  }, [navigate, location.pathname, location.search, scope, identityId])
}

/** Opens the send screen on Confirm of the unfinished operation with this asset lock. */
export function useOpenContinueOperation (): (assetLockTxid: string) => void {
  const navigate = useNavigate()
  const location = useLocation()

  return useCallback((assetLockTxid: string): void => {
    const state: SendContinueState = { ...locationReturnState(`${location.pathname}${location.search}`), continueAssetLockTxid: assetLockTxid }
    void navigate(sendPath('core'), { state })
  }, [navigate, location.pathname, location.search])
}
