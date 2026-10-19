import { useEffect, useState } from 'react'
import type { NetworkType } from '../../../../types'
import type { TransferApi } from '../transferApi'

// Wallet Core receive address offered as a Core recipient; null until loaded or when the wallet has none.
export function useOwnCoreAddress (api: TransferApi, enabled: boolean, walletId: string | null, network: NetworkType): string | null {
  const [address, setAddress] = useState<string | null>(null)

  useEffect(() => {
    setAddress(null)
    if (!enabled) return
    let active = true
    api.getCoreReceiveAddress()
      .then(value => { if (active) setAddress(value) })
      .catch(e => console.log('getCoreReceiveAddress error', e))
    return () => { active = false }
  }, [api, enabled, walletId, network])

  return address
}
