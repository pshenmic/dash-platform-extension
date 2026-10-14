import { useMemo } from 'react'
import { DashCoreSDK } from 'dash-core-sdk'
import { useOutletContext } from 'react-router-dom'
import type { LayoutContext } from '../components/layout/Layout'
import type { NetworkType } from '../../types'
import { PLATFORM_DAPI_URLS } from '../../constants'
import { asCoreDapiUrl } from '../../utils/dapiNodes'

// Pass a network to pin the SDK to it, otherwise it follows the current selection.
export const useCoreSDK = (network?: NetworkType): DashCoreSDK => {
  const { currentNetwork } = useOutletContext<LayoutContext>()
  const targetNetwork = network ?? currentNetwork ?? 'testnet'

  return useMemo(
    () => new DashCoreSDK({ network: targetNetwork, dapiUrl: asCoreDapiUrl(PLATFORM_DAPI_URLS[targetNetwork]) }),
    [targetNetwork]
  )
}
