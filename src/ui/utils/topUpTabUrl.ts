import { NetworkType } from '../../types'

// Wallet and network the top-up tab is pinned to, independent of the current selection.
export interface TopUpTabScope {
  identityId: string | null
  walletId: string | null
  network: NetworkType | null
}

// Top-up runs in its own tab, so its scope travels in the URL instead of the extension's selection.
export const buildTopUpUrl = (scope: TopUpTabScope, stage: number, failed = false): string => {
  const params = new URLSearchParams({ stage: String(stage) })

  if (scope.identityId != null) params.set('identity', scope.identityId)
  if (scope.walletId != null) params.set('wallet', scope.walletId)
  if (scope.network != null) params.set('network', scope.network)
  if (failed) params.set('error', 'true')

  return `/topup-identity?${params.toString()}`
}
