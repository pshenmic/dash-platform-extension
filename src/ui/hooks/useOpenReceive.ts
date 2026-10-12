import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { locationReturnState } from '../types'
import { receivePath } from '../utils/receivePath'
import type { ReceiveScope } from '../states/receive/types'

/** Opens the receive screen in the given scope, remembering the origin screen. */
export function useOpenReceive (scope: ReceiveScope = 'all', identityId?: string): () => void {
  const navigate = useNavigate()
  const location = useLocation()

  return useCallback((): void => {
    // An identity dashboard already names its destination, so skip the picker.
    const target = scope === 'identity' && identityId != null && identityId !== ''
      ? { type: 'identity' as const, value: identityId }
      : undefined

    void navigate(receivePath(scope, target), {
      state: locationReturnState(`${location.pathname}${location.search}`)
    })
  }, [navigate, location.pathname, location.search, scope, identityId])
}
