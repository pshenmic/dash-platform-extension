import { PROVING_NOTE } from '../../../constants'
import type { Direction, TransferMode } from '../types'

// Placeholder in info card texts replaced with the estimated fee in Dash.
export const FEE_PLACEHOLDER = '{fee}'

export type HashType = 'core' | 'platform' | 'single'
export type FeeSource = 'coreEstimate' | 'identityEstimate' | 'platformTransfer' | 'shieldedEstimate' | 'withdrawal'

export interface InfoCardConfig {
  title: string
  text: string
  duration?: string
}

// Direction-dependent part of the send wizard.
export interface DirectionDetails {
  infoCard?: InfoCardConfig
  confirmLabel: string
  // Multi-step transfer that shows the Progress screen.
  hasProgress: boolean
  successMessage: string
  hashes: HashType[]
  advanced: boolean
  feeSource: FeeSource
}

export interface DirectionConfig extends DirectionDetails {
  supported: boolean
  mode: TransferMode
}

const CROSS_LAYER_DURATION = '1-3 Min'

const SENT_TO_ADDRESS = 'Funds were successfully sent to the address.'
const SENT_TO_IDENTITY = 'Funds were successfully sent to the identity balance.'
const SENT_TO_PLATFORM_ADDRESS = 'Funds were successfully sent to the platform address.'
const SENT_TO_OWN_SHIELDED = 'Funds were successfully sent to your shielded balance.'
export const SENT_TO_SHIELDED_ADDRESS = 'Funds were successfully sent to the shielded address.'
const SENT_TO_CORE = 'Sent to Core Chain. It will confirm after some time.'

const TOP_UP_IDENTITY_CARD: InfoCardConfig = {
  title: 'Top up from L1',
  text: 'Locks Dash on L1 and credits the identity with the locked amount. You can top up any identity by its identifier - not just your own. The process resumes automatically if interrupted.',
  duration: CROSS_LAYER_DURATION
}

const TOP_UP_ADDRESS_CARD: InfoCardConfig = {
  title: 'Top up from L1',
  text: 'Locks Dash on L1 and credits the platform address with the locked amount. You can fund any platform address - not just your own. The process resumes automatically if interrupted.',
  duration: CROSS_LAYER_DURATION
}

const TWO_STEP_SHIELDING_CARD: InfoCardConfig = {
  title: 'Two-step Shielding',
  text: 'Locking Dash broadcasts an L1 transaction, waits for a Chain Lock (a few minutes) and then shields the credits into your shielded balance or the shielded address you enter. The L1 lock amount stays publicly visible.',
  duration: CROSS_LAYER_DURATION
}

const CROSS_CHAIN_WITHDRAWAL_CARD: InfoCardConfig = {
  title: 'Cross-chain withdrawal',
  text: `Withdrawing to Core costs a ${FEE_PLACEHOLDER} network fee and the Dash payout arrives asynchronously after the withdrawal is processed.`,
  duration: CROSS_LAYER_DURATION
}

const SHIELDING_CARD: InfoCardConfig = {
  title: 'Shielding',
  text: PROVING_NOTE
}

const SINGLE_HASH = {
  hasProgress: false,
  hashes: ['single'] as HashType[],
  advanced: false
}

const CORE_TO_PLATFORM = {
  confirmLabel: 'Top Up',
  hashes: ['core', 'platform'] as HashType[],
  advanced: false,
  feeSource: 'coreEstimate' as const
}

const WITHDRAWAL = {
  infoCard: CROSS_CHAIN_WITHDRAWAL_CARD,
  confirmLabel: 'Withdraw',
  successMessage: SENT_TO_CORE,
  hashes: ['core', 'platform'] as HashType[],
  advanced: false,
  feeSource: 'withdrawal' as const
}

// Details of every supported direction; unsupported pairs have no entry.
export const DIRECTION_DETAILS: Partial<Record<Direction, DirectionDetails>> = {
  'core->core': {
    confirmLabel: 'Send',
    hasProgress: false,
    successMessage: SENT_TO_ADDRESS,
    hashes: ['single'],
    advanced: true,
    feeSource: 'coreEstimate'
  },
  'core->identity': {
    ...CORE_TO_PLATFORM,
    infoCard: TOP_UP_IDENTITY_CARD,
    hasProgress: true,
    successMessage: SENT_TO_IDENTITY
  },
  'core->platformAddress': {
    ...CORE_TO_PLATFORM,
    infoCard: TOP_UP_ADDRESS_CARD,
    hasProgress: true,
    successMessage: SENT_TO_PLATFORM_ADDRESS
  },
  'core->shielded': {
    ...CORE_TO_PLATFORM,
    infoCard: TWO_STEP_SHIELDING_CARD,
    confirmLabel: 'Shield',
    hasProgress: true,
    successMessage: SENT_TO_OWN_SHIELDED
  },
  'identity->core': {
    ...WITHDRAWAL,
    hasProgress: true
  },
  'identity->identity': {
    ...SINGLE_HASH,
    confirmLabel: 'Send',
    successMessage: SENT_TO_IDENTITY,
    feeSource: 'identityEstimate'
  },
  'identity->platformAddress': {
    ...SINGLE_HASH,
    confirmLabel: 'Send',
    successMessage: SENT_TO_PLATFORM_ADDRESS,
    feeSource: 'platformTransfer'
  },
  'platformAddress->core': {
    ...WITHDRAWAL,
    hasProgress: true
  },
  'platformAddress->identity': {
    ...SINGLE_HASH,
    confirmLabel: 'Top Up',
    successMessage: SENT_TO_IDENTITY,
    feeSource: 'platformTransfer'
  },
  'platformAddress->platformAddress': {
    ...SINGLE_HASH,
    confirmLabel: 'Send',
    successMessage: SENT_TO_PLATFORM_ADDRESS,
    advanced: false,
    feeSource: 'platformTransfer'
  },
  'platformAddress->shielded': {
    ...SINGLE_HASH,
    infoCard: SHIELDING_CARD,
    confirmLabel: 'Shield',
    hasProgress: true,
    successMessage: SENT_TO_OWN_SHIELDED,
    feeSource: 'shieldedEstimate'
  },
  'shielded->core': {
    ...WITHDRAWAL,
    hasProgress: true
  },
  'shielded->platformAddress': {
    ...SINGLE_HASH,
    confirmLabel: 'Unshield',
    hasProgress: true,
    successMessage: SENT_TO_PLATFORM_ADDRESS,
    feeSource: 'shieldedEstimate'
  },
  'shielded->shielded': {
    ...SINGLE_HASH,
    confirmLabel: 'Send',
    hasProgress: true,
    successMessage: SENT_TO_SHIELDED_ADDRESS,
    feeSource: 'shieldedEstimate'
  }
}
