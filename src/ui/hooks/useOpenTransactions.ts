import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { locationReturnState } from '../types'
import { transactionsPath } from '../utils/transactionsPath'
import type { TransactionsScope } from '../states/transactions/types'

/** Opens the transactions list in the given scope, remembering the origin screen. */
export function useOpenTransactions (scope: TransactionsScope = 'all', identityId?: string): () => void {
  const navigate = useNavigate()
  const location = useLocation()

  return useCallback((): void => {
    void navigate(transactionsPath(scope, identityId), {
      state: locationReturnState(`${location.pathname}${location.search}`)
    })
  }, [navigate, location.pathname, location.search, scope, identityId])
}
