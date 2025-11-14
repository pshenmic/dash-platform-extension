import type { TokenData } from '../types'
import { fromBaseUnit } from './index'

/**
 * Get asset label (short form) for display
 */
export function getAssetLabel (selectedAsset: string, token?: TokenData): string {
  if (selectedAsset === 'credits') return 'CRDT'

  if (token != null) {
    const singularForm = token.localizations?.en?.singularForm ?? token.identifier
    return singularForm.toUpperCase().slice(0, 4)
  }

  return 'N/A'
}

/**
 * Get asset full name for display
 */
export function getAssetName (selectedAsset: string, token?: TokenData): string {
  if (selectedAsset === 'credits') return 'Credits'

  if (token != null) {
    return token.localizations?.en?.singularForm ?? token.identifier
  }

  return 'Token'
}

/**
 * Get formatted balance for selected asset
 */
export function getFormattedBalance (
  selectedAsset: string,
  creditsBalance: bigint | null,
  token?: TokenData
): string {
  if (selectedAsset === 'credits' && creditsBalance !== null) {
    return creditsBalance.toString()
  }

  if (token != null) {
    return fromBaseUnit(token.balance, token.decimals)
  }

  return '0'
}

/**
 * Get available balance as string for calculations
 */
export function getAvailableBalance (
  selectedAsset: string,
  creditsBalance: bigint | null,
  token?: TokenData
): string {
  if (selectedAsset === 'credits' && creditsBalance !== null) {
    return creditsBalance.toString()
  }

  if (token != null) {
    return fromBaseUnit(token.balance, token.decimals)
  }

  return '0'
}

/**
 * Get decimals for selected asset
 */
export function getAssetDecimals (selectedAsset: string, token?: TokenData): number {
  if (selectedAsset === 'credits') return 0
  return token?.decimals ?? 0
}

/**
 * Format token amount for display
 */
export function formatTokenAmount (amount: string): string {
  if (amount === '' || amount === '0') return '0'

  const numValue = Number(amount)
  if (!isNaN(numValue)) {
    return numValue.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 8
    })
  }

  return amount
}
