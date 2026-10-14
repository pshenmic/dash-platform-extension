import { AddressCreditWithdrawalTransitionWASM, CoreScriptWASM, IdentityCreditWithdrawalTransitionWASM } from 'pshenmic-dpp'
import { MAX_WITHDRAWAL_CREDITS, WITHDRAWAL_CORE_FEE_PER_BYTE, WITHDRAWAL_POOLING } from '../constants'

// The fee a withdrawal to Core has to carry, taken from dpp's own fee model
// rather than guessed. Platform meters the real charge while it executes the
// transition, and this is the minimum it demands upfront - the number to show as
// the network fee and to reserve when checking whether a source can pay.
//
// Both figures are an order of magnitude above the flat TRANSFER_FEE_CREDITS the
// wallet reserves for ordinary transfers: a withdrawal also pays for the document
// it inserts for the quorum to sign. Nothing else about the transition moves
// them - not the amount, the recipient script, the core fee rate, the pooling
// mode or the signature - so an estimate needs no network and no password.

// Withdrawal from a Platform address. The fee grows with the inputs the
// transition spends and with a change output, so it is modelled rather than
// taken from a built transition: an unsigned transition carries no witnesses and
// would come out cheaper than the one that is actually broadcast.
export const addressWithdrawalFeeCredits = (inputCount: number = 1, hasChangeOutput: boolean = false): bigint => {
  return AddressCreditWithdrawalTransitionWASM.estimateMinFee(inputCount, hasChangeOutput)
}

// Withdrawal from an identity balance. There is no static estimate for this one,
// so the fee comes from a transition built with the values we have; the model
// ignores the nonce, so an estimate does not have to read it from Platform.
export const identityWithdrawalFeeCredits = (
  identityId: string,
  amountCredits: bigint,
  outputScript?: CoreScriptWASM,
  identityNonce: bigint = 1n
): bigint => {
  const transition = new IdentityCreditWithdrawalTransitionWASM(
    identityId,
    amountCredits,
    WITHDRAWAL_CORE_FEE_PER_BYTE,
    WITHDRAWAL_POOLING,
    identityNonce,
    outputScript
  )

  return transition.calculateMinRequiredFee()
}

// The largest withdrawal a balance allows, once the fee is paid out of it.
// Platform refuses anything above MAX_WITHDRAWAL_CREDITS whatever the balance.
export const maxWithdrawalCredits = (balanceCredits: bigint, feeCredits: bigint): bigint => {
  const spendable = balanceCredits - feeCredits

  if (spendable <= 0n) {
    return 0n
  }

  return spendable > MAX_WITHDRAWAL_CREDITS ? MAX_WITHDRAWAL_CREDITS : spendable
}
