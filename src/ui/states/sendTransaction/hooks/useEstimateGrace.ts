import { useEffect, useState } from 'react'
import { ESTIMATE_GRACE_MS } from '../constants'

// Whether the estimate requested under `pendingKey` is still inside its grace period; null means nothing is pending.
export function useEstimateGrace (pendingKey: string | null): boolean {
  const [expiredKey, setExpiredKey] = useState<string | null>(null)

  useEffect(() => {
    if (pendingKey == null) return
    const timer = setTimeout(() => setExpiredKey(pendingKey), ESTIMATE_GRACE_MS)
    return () => clearTimeout(timer)
  }, [pendingKey])

  return pendingKey != null && expiredKey !== pendingKey
}
