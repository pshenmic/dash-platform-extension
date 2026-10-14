import { checkRecipients } from './transferRecipients'
import type { RecipientsCheck } from './transferRecipients'
import { assetLockReceived, feeOnLayer, isAssetLockMode, parseDashAmount, SHIELD_DEPOSIT_FEE_DUFFS, transferAmountLimits, validateTransferAmount } from './transferAmount'
import type { TransferAmountLimits } from './transferAmount'
import { isShieldToMyself } from './transferDirection'
import type { TransferDraft, TransferMode } from '../ui/states/sendTransaction/types'

const SAME_PARTY_MESSAGE = 'Recipient must be different from the sender.'

// Balance of the source in base units of the asset.
interface SourceAmount {
  amount: bigint | null
  decimals: number
  unit: string
}

interface LayerFee {
  amount: bigint
  decimals: number
  // Fee comes out of the amount instead of on top of it.
  takenFromAmount?: boolean
}

export interface TransferAmountInput {
  limits: TransferAmountLimits | null
  recipientsCheck: RecipientsCheck
  amount: bigint | null
}

interface TransferValidationParams {
  draft: TransferDraft
  mode: TransferMode | null
  balance: SourceAmount
  // False while a chosen token is not among the identity's tokens yet.
  assetKnown: boolean
  fee: LayerFee | null
  // Max from an estimate, which wins over the balance minus the fee.
  knownMax: bigint | null
  // Min from an estimate, which wins over the mode minimum.
  knownMin: bigint | null
  input: TransferAmountInput
  // Identity or address the funds leave, matched against the recipients.
  senderIdentifier: string | null
  shieldedReady: boolean
  // A paid top up is resumed without spending the balance again.
  isResumingFunding: boolean
}

export interface TransferValidation {
  maxAmount: bigint | null
  amountError: string | null
  advancedError: string | null
  recipientError: string | null
  received: bigint | null
  fromToValid: boolean
  amountValid: boolean
}

// Typed amount of the draft in source base units: the recipients total in Advanced, the Amount field otherwise.
export const transferAmountInput = (draft: TransferDraft, mode: TransferMode | null, decimals: number): TransferAmountInput => {
  const limits = mode != null ? transferAmountLimits(mode) : null
  const recipientsCheck = checkRecipients(draft.recipients, decimals, limits?.min ?? 1n)
  const amount = draft.isAdvanced ? recipientsCheck.total : parseDashAmount(draft.amount, decimals)
  return { limits, recipientsCheck, amount }
}

// Errors and step readiness of the draft.
// What the recipient gets when fees come out of the amount; null when it gets the amount itself.
const receivedAmount = (amount: bigint | null, mode: TransferMode | null, fee: LayerFee | null): bigint | null => {
  if (amount == null) return null
  if (mode === 'coreShield') return assetLockReceived(amount) - SHIELD_DEPOSIT_FEE_DUFFS
  if (isAssetLockMode(mode)) return assetLockReceived(amount)
  if (fee?.takenFromAmount === true) return amount > fee.amount ? amount - fee.amount : 0n
  return null
}

export const validateTransfer = ({ draft, mode, balance, assetKnown, fee, knownMax, knownMin, input, senderIdentifier, shieldedReady, isResumingFunding }: TransferValidationParams): TransferValidation => {
  const { limits, recipientsCheck, amount } = input
  const isDash = draft.asset.type === 'dash'
  const maxAmount = knownMax ?? (balance.amount == null ? null : balance.amount - (isDash ? feeOnLayer(fee, balance.decimals) : 0n))
  const amountLimits = limits != null ? { ...limits, min: knownMin ?? limits.min } : null
  const amountError = amountLimits != null ? validateTransferAmount(amount, maxAmount, draft.isAdvanced ? { min: 1n, max: null } : amountLimits, balance.decimals, balance.unit) : null

  const isSender = (address: string): boolean => address !== '' && address === senderIdentifier
  const isSameParty = draft.isAdvanced ? draft.recipients.some(recipient => isSender(recipient.address)) : isSender(draft.to.recipient)
  const advancedError = !draft.isAdvanced
    ? null
    : isSameParty
      ? SAME_PARTY_MESSAGE
      : recipientsCheck.isValid ? amountError : null
  const recipientError = !draft.isAdvanced && isSameParty ? SAME_PARTY_MESSAGE : null
  const received = receivedAmount(amount, mode, fee)

  const fromToValid = mode != null &&
    assetKnown &&
    (draft.from.type !== 'identity' || draft.from.identityId != null) &&
    (draft.isAdvanced ? recipientsCheck.isValid && advancedError == null && draft.changeAddress !== '' : isShieldToMyself(draft) || draft.to.recipient !== '') &&
    (draft.isAdvanced || recipientError == null) &&
    shieldedReady
  const amountValid = fromToValid && amount != null && amount > 0n && (isResumingFunding || (balance.amount != null && amountError == null))

  return { maxAmount, amountError, advancedError, recipientError, received, fromToValid, amountValid }
}
