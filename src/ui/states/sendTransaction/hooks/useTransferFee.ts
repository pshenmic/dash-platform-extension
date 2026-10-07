import { useEffect, useState } from 'react'
import { ESTIMATED_FEES } from '../../../constants'
import { SHIELDED_SPEND_FEE_CREDITS, TRANSFER_FEE_CREDITS } from '../../../../constants'
import { computeShieldedSpendFee, CORE_DASH_DECIMALS, PLATFORM_DASH_DECIMALS } from '../../../../utils'
import type { ShieldedSpendEstimate } from '../../../../utils'
import type { NetworkType } from '../../../../types'
import type { ShieldedSpendKind } from '../../../../types/ShieldedSpendKind'
import type { DirectionConfig } from '../directions/directionConfig'
import type { TransferApi } from '../transferApi'
import type { TransferDraft } from '../types'

// Network fee in base units of the layer that pays it: duffs on Core, credits on Platform.
export interface TransferFee {
  amount: bigint
  decimals: number
}

interface TransferFeeParams {
  api: TransferApi
  config: DirectionConfig | null
  draft: TransferDraft
  network: NetworkType
  shieldedSpendEstimates: Partial<Record<ShieldedSpendKind, ShieldedSpendEstimate>>
}

// Fee of every Platform source type that has no estimate, in credits.
const staticFee = (config: DirectionConfig, draft: TransferDraft, network: NetworkType): bigint => {
  const identityFee = draft.asset.type === 'token' ? ESTIMATED_FEES[network].tokens : ESTIMATED_FEES[network].credits

  switch (config.feeSource) {
    case 'identityEstimate':
      return identityFee
    case 'withdrawal':
      if (draft.from.type === 'identity') return identityFee
      return draft.from.type === 'shielded' ? SHIELDED_SPEND_FEE_CREDITS : TRANSFER_FEE_CREDITS
    case 'shieldedEstimate':
      return draft.from.type === 'shielded' ? SHIELDED_SPEND_FEE_CREDITS : TRANSFER_FEE_CREDITS
    default:
      return TRANSFER_FEE_CREDITS
  }
}

const SHIELDED_SPEND_TYPES: Partial<Record<string, ShieldedSpendKind>> = {
  unshield: 'unshield',
  shieldedTransfer: 'transfer',
  shieldedWithdraw: 'withdrawal'
}

// Largest amount an automatic shielded spend can send after its fee; null when it does not apply or is unknown.
export const shieldedMaxAmount = (config: DirectionConfig | null, draft: TransferDraft, estimates: Partial<Record<ShieldedSpendKind, ShieldedSpendEstimate>>): bigint | null => {
  const spendType = config != null ? SHIELDED_SPEND_TYPES[config.mode] : undefined
  if (spendType == null || draft.coinControl.type !== 'automatic') return null
  return estimates[spendType]?.amountCredits ?? null
}

// Estimated network fee of the transfer; null while unknown.
export function useTransferFee ({ api, config, draft, network, shieldedSpendEstimates }: TransferFeeParams): TransferFee | null {
  const isCore = config?.feeSource === 'coreEstimate'
  const isAssetLock = config?.mode === 'coreShield'
  const inputs = draft.coinControl.type === 'utxo' ? draft.coinControl.inputs : undefined
  const outputCount = draft.isAdvanced ? Math.max(draft.recipients.length, 1) : 1
  const [coreFee, setCoreFee] = useState<bigint | null>(null)

  useEffect(() => {
    if (!isCore) return

    setCoreFee(null)
    let cancelled = false
    api.estimateCoreFee({ outputs: Array.from({ length: outputCount }, () => ({ address: '', amount: '0' })), inputs, type: isAssetLock ? 'assetLock' : 'transfer' })
      .then(({ fee }) => { if (!cancelled) setCoreFee(BigInt(fee)) })
      .catch(e => console.log('estimateCoreFee error', e))

    return () => { cancelled = true }
  }, [api, isCore, isAssetLock, inputs, outputCount])

  if (config == null) return null
  if (isCore) return coreFee != null ? { amount: coreFee, decimals: CORE_DASH_DECIMALS } : null

  const spendType = SHIELDED_SPEND_TYPES[config.mode]
  if (spendType != null && draft.coinControl.type === 'shieldedNotes') {
    return { amount: computeShieldedSpendFee(spendType, draft.coinControl.noteIds.length), decimals: PLATFORM_DASH_DECIMALS }
  }
  const estimate = spendType != null ? shieldedSpendEstimates[spendType]?.feeCredits : undefined
  return { amount: estimate ?? staticFee(config, draft, network), decimals: PLATFORM_DASH_DECIMALS }
}
