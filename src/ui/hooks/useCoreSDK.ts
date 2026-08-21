import { useMemo } from 'react'
import { DashCoreSDK } from 'dash-core-sdk'
import { useOutletContext } from 'react-router-dom'
import type { LayoutContext } from '../components/layout/Layout'

export const useCoreSDK = (): DashCoreSDK => {
  const { currentNetwork } = useOutletContext<LayoutContext>()

  return useMemo(
    () => new DashCoreSDK({ network: currentNetwork ?? 'testnet' }),
    [currentNetwork]
  )
}
