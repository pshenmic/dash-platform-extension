import { useMemo } from 'react'
import { endpointDashDecimals, summarizeCoinControl } from '../../../../utils'
import type { TokenData } from '../../../../types'
import type { AddressData } from '../../../components/addresses/types'
import type { CoreUtxo, ShieldedNote, TransferDraft } from '../types'

export interface SourceBalance {
  amount: bigint | null
  decimals: number
  unit: string
  sourceAddress: string | null
}

interface SourceBalanceParams {
  draft: TransferDraft
  identityBalance: bigint | null
  coreBalance: bigint | null
  platformAddresses: AddressData[]
  shieldedBalance: bigint | null
  utxos: CoreUtxo[]
  notes: ShieldedNote[]
  token: TokenData | undefined
}

// Platform address with the largest balance, the one an automatic transfer spends from.
const largestAddress = (addresses: AddressData[]): { address: string, balance: bigint } | null =>
  addresses.reduce<{ address: string, balance: bigint } | null>((max, { address, balance }) => {
    if (balance == null) return max
    const value = BigInt(balance)
    return max == null || value > max.balance ? { address, balance: value } : max
  }, null)

const sum = (values: bigint[]): bigint => values.reduce((total, value) => total + value, 0n)

// Spendable balance of the selected source in base units of the asset, narrowed by Coin Control.
export function useSourceBalance ({ draft, identityBalance, coreBalance, platformAddresses, shieldedBalance, utxos, notes, token }: SourceBalanceParams): SourceBalance {
  return useMemo((): SourceBalance => {
    if (draft.asset.type === 'token') {
      return { amount: token != null ? BigInt(token.balance) : null, decimals: token?.decimals ?? 0, unit: token?.localizations?.en?.singularForm ?? 'Token', sourceAddress: null }
    }

    const decimals = endpointDashDecimals(draft.from.type)
    const selection = draft.coinControl

    if (selection.type === 'utxo' || selection.type === 'shieldedNotes') {
      return { amount: summarizeCoinControl(selection, utxos, notes).total, decimals, unit: 'Dash', sourceAddress: null }
    }

    if (selection.type === 'platformInputs') {
      const picked = platformAddresses.filter(item => selection.inputs.some(input => input.address === item.address))
      const sourceAddress = selection.inputs.length === 1 ? selection.inputs[0].address : null
      return { amount: sum(picked.map(item => BigInt(item.balance ?? '0'))), decimals, unit: 'Dash', sourceAddress }
    }

    const source = largestAddress(platformAddresses)
    const amounts: Record<TransferDraft['from']['type'], bigint | null> = {
      core: coreBalance,
      identity: identityBalance,
      platformAddress: source?.balance ?? null,
      shielded: shieldedBalance
    }

    return { amount: amounts[draft.from.type], decimals, unit: 'Dash', sourceAddress: draft.from.type === 'platformAddress' ? source?.address ?? null : null }
  }, [draft.asset, draft.from.type, draft.coinControl, identityBalance, coreBalance, platformAddresses, shieldedBalance, utxos, notes, token])
}
