import { ESTIMATED_FEES } from '../../../constants'
import { SHIELDED_SPEND_FEE_CREDITS, TRANSFER_FEE_CREDITS } from '../../../../constants'
import type { NetworkType } from '../../../../types'
import type { ShieldedSpendKind } from '../../../../types/ShieldedSpendKind'
import type { DirectionConfig } from '../directions/directionConfig'
import type { TransferDraft } from '../types'

interface TransferFeeParams {
  config: DirectionConfig | null
  draft: TransferDraft
  network: NetworkType
  shieldedSpendFees: Partial<Record<ShieldedSpendKind, bigint>>
}

// Fee of every source type that has no estimate, in credits.
const staticFee = (config: DirectionConfig, draft: TransferDraft, network: NetworkType): bigint | null => {
  const identityFee = draft.asset.type === 'token' ? ESTIMATED_FEES[network].tokens : ESTIMATED_FEES[network].credits

  switch (config.feeSource) {
    case 'identityEstimate':
      return identityFee
    case 'platformTransfer':
      return TRANSFER_FEE_CREDITS
    case 'withdrawal':
      if (draft.from.type === 'identity') return identityFee
      return draft.from.type === 'shielded' ? SHIELDED_SPEND_FEE_CREDITS : TRANSFER_FEE_CREDITS
    case 'shieldedEstimate':
      return draft.from.type === 'shielded' ? SHIELDED_SPEND_FEE_CREDITS : TRANSFER_FEE_CREDITS
    case 'coreEstimate':
      return null
  }
}

const SHIELDED_SPEND_TYPES: Partial<Record<string, ShieldedSpendKind>> = {
  unshield: 'unshield',
  shieldedTransfer: 'transfer'
}

// Estimated network fee of the transfer in credits (the largest shielded spend for shielded sources); null while unknown.
export function useTransferFee ({ config, draft, network, shieldedSpendFees }: TransferFeeParams): bigint | null {
  if (config == null) return null
  const spendType = SHIELDED_SPEND_TYPES[config.mode]
  const estimate = spendType != null ? shieldedSpendFees[spendType] : undefined
  return estimate ?? staticFee(config, draft, network)
}
