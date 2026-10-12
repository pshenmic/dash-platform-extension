import { useEffect, useState } from 'react'
import type { NetworkType } from '../../../../types'
import type { TransferApi } from '../transferApi'

// Wallet Core addresses offered as a custom change address, loaded once an Advanced Core transfer needs them.
export function useChangeAddresses (api: TransferApi, enabled: boolean, walletId: string | null, network: NetworkType): string[] {
  const [addresses, setAddresses] = useState<string[]>([])

  useEffect(() => {
    if (!enabled) return
    api.listCoreAddresses().then(setAddresses).catch(e => console.log('listCoreAddresses error', e))
  }, [api, enabled, walletId, network])

  return addresses
}
