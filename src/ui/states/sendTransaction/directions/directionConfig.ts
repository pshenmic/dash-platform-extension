import { PROVING_NOTE } from '../../../constants'
import type { Direction, TransferMode } from '../types'

// Placeholder in info card texts replaced with the estimated fee in Dash.
export const FEE_PLACEHOLDER = '{fee}'

export type HashType = 'core' | 'platform' | 'single'
export type CoinControlType = 'utxo' | 'platformInputs' | 'shieldedNotes'
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
  stages: string[]
  successMessage: string
  hashes: HashType[]
  coinControl: CoinControlType | null
  advanced: boolean
  feeSource: FeeSource
  usesMock: boolean
}

export interface DirectionConfig extends DirectionDetails {
  supported: boolean
  mode: TransferMode
}

const CROSS_LAYER_DURATION = '1-3 Min'

const STAGE_L1_BROADCAST = 'Broadcasting the L1 asset lock transaction'
const STAGE_L1_CONFIRMATION = 'Waiting for confirmation (InstantSend or ChainLock)'
const STAGE_L2_BROADCAST = 'Broadcasting the L2 transaction'
const STAGE_FINALIZATION = 'Waiting for transaction finalization'
const STAGE_PROVING = 'Proving the transaction'

const SENT_TO_ADDRESS = 'Funds were successfully sent to the address.'
const SENT_TO_IDENTITY = 'Funds were successfully sent to the identity balance.'
const SENT_TO_PLATFORM_ADDRESS = 'Funds were successfully sent to the platform address.'
const SENT_TO_OWN_SHIELDED = 'Funds were successfully sent to your shielded balance.'
const SENT_TO_SHIELDED_ADDRESS = 'Funds were successfully sent to the shielded address.'
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
  text: 'Locking Dash broadcasts an L1 transaction, waits for a Chain Lock (a few minutes) and then shields the credits straight into your shielded balance. The L1 lock amount stays publicly visible; the process resumes automatically if interrupted.',
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
  stages: [],
  hashes: ['single'] as HashType[],
  advanced: false,
  usesMock: false
}

const CORE_TO_PLATFORM = {
  confirmLabel: 'Top Up',
  hashes: ['core', 'platform'] as HashType[],
  coinControl: 'utxo' as const,
  advanced: false,
  feeSource: 'coreEstimate' as const,
  usesMock: true
}

const WITHDRAWAL = {
  infoCard: CROSS_CHAIN_WITHDRAWAL_CARD,
  confirmLabel: 'Withdraw',
  successMessage: SENT_TO_CORE,
  hashes: ['core', 'platform'] as HashType[],
  advanced: false,
  feeSource: 'withdrawal' as const,
  usesMock: false
}

// Details of every supported direction; unsupported pairs have no entry.
export const DIRECTION_DETAILS: Partial<Record<Direction, DirectionDetails>> = {
  'core->core': {
    confirmLabel: 'Send',
    stages: [],
    successMessage: SENT_TO_ADDRESS,
    hashes: ['single'],
    coinControl: 'utxo',
    advanced: true,
    feeSource: 'coreEstimate',
    usesMock: true
  },
  'core->identity': {
    ...CORE_TO_PLATFORM,
    infoCard: TOP_UP_IDENTITY_CARD,
    stages: [STAGE_L1_BROADCAST, STAGE_L1_CONFIRMATION, 'Topping up the Platform Identity'],
    successMessage: SENT_TO_IDENTITY
  },
  'core->platformAddress': {
    ...CORE_TO_PLATFORM,
    infoCard: TOP_UP_ADDRESS_CARD,
    stages: [STAGE_L1_BROADCAST, STAGE_L1_CONFIRMATION, 'Topping up the Platform Address'],
    successMessage: SENT_TO_PLATFORM_ADDRESS
  },
  'core->shielded': {
    ...CORE_TO_PLATFORM,
    infoCard: TWO_STEP_SHIELDING_CARD,
    confirmLabel: 'Shield',
    stages: [STAGE_L1_BROADCAST, STAGE_L1_CONFIRMATION, 'Proving and Shielding credits'],
    successMessage: SENT_TO_OWN_SHIELDED
  },
  'identity->core': {
    ...WITHDRAWAL,
    stages: [STAGE_L2_BROADCAST, STAGE_FINALIZATION],
    coinControl: null
  },
  'identity->identity': {
    ...SINGLE_HASH,
    confirmLabel: 'Send',
    successMessage: SENT_TO_IDENTITY,
    coinControl: null,
    feeSource: 'identityEstimate'
  },
  'identity->platformAddress': {
    ...SINGLE_HASH,
    confirmLabel: 'Send',
    successMessage: SENT_TO_PLATFORM_ADDRESS,
    coinControl: null,
    feeSource: 'platformTransfer'
  },
  'platformAddress->core': {
    ...WITHDRAWAL,
    stages: [STAGE_L2_BROADCAST, STAGE_FINALIZATION],
    coinControl: 'platformInputs'
  },
  'platformAddress->identity': {
    ...SINGLE_HASH,
    confirmLabel: 'Top Up',
    successMessage: SENT_TO_IDENTITY,
    coinControl: 'platformInputs',
    feeSource: 'platformTransfer'
  },
  'platformAddress->platformAddress': {
    ...SINGLE_HASH,
    confirmLabel: 'Send',
    successMessage: SENT_TO_PLATFORM_ADDRESS,
    coinControl: 'platformInputs',
    advanced: true,
    feeSource: 'platformTransfer',
    usesMock: true
  },
  'platformAddress->shielded': {
    ...SINGLE_HASH,
    infoCard: SHIELDING_CARD,
    confirmLabel: 'Shield',
    stages: [STAGE_PROVING, STAGE_L2_BROADCAST],
    successMessage: SENT_TO_OWN_SHIELDED,
    coinControl: 'platformInputs',
    feeSource: 'shieldedEstimate'
  },
  'shielded->core': {
    ...WITHDRAWAL,
    stages: [STAGE_PROVING, STAGE_L2_BROADCAST, STAGE_FINALIZATION],
    coinControl: 'shieldedNotes'
  },
  'shielded->platformAddress': {
    ...SINGLE_HASH,
    confirmLabel: 'Unshield',
    stages: [STAGE_PROVING, STAGE_L2_BROADCAST],
    successMessage: SENT_TO_PLATFORM_ADDRESS,
    coinControl: 'shieldedNotes',
    feeSource: 'shieldedEstimate'
  },
  'shielded->shielded': {
    ...SINGLE_HASH,
    confirmLabel: 'Send',
    stages: [STAGE_PROVING, STAGE_L2_BROADCAST],
    successMessage: SENT_TO_SHIELDED_ADDRESS,
    coinControl: 'shieldedNotes',
    feeSource: 'shieldedEstimate'
  }
}
