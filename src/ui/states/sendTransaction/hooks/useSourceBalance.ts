import { useMemo } from 'react'
import { endpointDashDecimals } from '../../../../utils'
import type { TokenData } from '../../../../types'
import type { AddressData } from '../../../components/addresses/types'
import type { TransferDraft } from '../types'

export interface SourceBalance {
  amount: bigint | null
  decimals: number
  unit: string
  sourceAddress: string | null
}

interface SourceBalanceParams {
  draft: TransferDraft
  identityBalance: bigint | null
  platformAddresses: AddressData[]
  shieldedBalance: bigint | null
  token: TokenData | undefined
}

// Platform address with the largest balance, the one an automatic transfer spends from.
const largestAddress = (addresses: AddressData[]): { address: string, balance: bigint } | null =>
  addresses.reduce<{ address: string, balance: bigint } | null>((max, { address, balance }) => {
    if (balance == null) return max
    const value = BigInt(balance)
    return max == null || value > max.balance ? { address, balance: value } : max
  }, null)

// Spendable balance of the selected source in base units of the asset.
export function useSourceBalance ({ draft, identityBalance, platformAddresses, shieldedBalance, token }: SourceBalanceParams): SourceBalance {
  return useMemo((): SourceBalance => {
    if (draft.asset.type === 'token') {
      return { amount: token != null ? BigInt(token.balance) : null, decimals: token?.decimals ?? 0, unit: token?.localizations?.en?.singularForm ?? 'Token', sourceAddress: null }
    }

    const decimals = endpointDashDecimals(draft.from.type)
    const source = largestAddress(platformAddresses)
    const amounts: Record<TransferDraft['from']['type'], bigint | null> = {
      core: null,
      identity: identityBalance,
      platformAddress: source?.balance ?? null,
      shielded: shieldedBalance
    }

    return { amount: amounts[draft.from.type], decimals, unit: 'Dash', sourceAddress: draft.from.type === 'platformAddress' ? source?.address ?? null : null }
  }, [draft.asset, draft.from.type, identityBalance, platformAddresses, shieldedBalance, token])
}
