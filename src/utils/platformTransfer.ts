import {
  InputAddressWASM,
  OutputAddressWASM,
  AddressFundsFeeStrategyStepWASM,
  AddressFundsTransferTransitionWASM,
  AddressWitnessWASM,
  IdentityCreditTransferToAddressesTransitionWASM,
  PrivateKeyWASM,
  StateTransitionWASM
} from 'pshenmic-dpp'
import { MIN_OUTPUT_CREDITS, TRANSFER_FEE_CREDITS } from '../constants'

export interface PlatformSourceCandidate {
  platformAddress: string
  derivationPath: string
  index: number
  balanceCredits: bigint
  nonce: number
}

// Picks the platform address to spend from: the explicit one if given, otherwise
// the largest balance that covers amount + fee.
export const selectPlatformSource = (candidates: PlatformSourceCandidate[], amountCredits: bigint, fromAddress?: string): PlatformSourceCandidate => {
  if (amountCredits < MIN_OUTPUT_CREDITS) {
    throw new Error(`Minimum Platform transfer is ${MIN_OUTPUT_CREDITS.toString()} credits`)
  }

  const required = amountCredits + TRANSFER_FEE_CREDITS

  if (fromAddress != null) {
    const chosen = candidates.find(candidate => candidate.platformAddress === fromAddress)

    if (chosen == null) {
      throw new Error('Source address not found in this wallet')
    }
    if (chosen.balanceCredits < required) {
      throw new Error('Source address has insufficient credits for this transfer plus fee')
    }

    return chosen
  }

  const funded = candidates.filter(candidate => candidate.balanceCredits >= required)

  if (funded.length === 0) {
    throw new Error('No Platform address holds enough credits for this transfer plus fee')
  }

  return funded.reduce((best, candidate) => candidate.balanceCredits > best.balanceCredits ? candidate : best)
}

// Builds and signs an addressFundsTransfer state transition: a single input from
// the source (nonce + 1) and a single output to the recipient, with the fee
// deducted from the input. Signs the unsigned ST's signable bytes and attaches a
// P2PKH witness.
export const buildSignedPlatformTransfer = (sourceAddress: string, sourceNonce: number, toAddress: string, amountCredits: bigint, sourcePrivateKey: PrivateKeyWASM): StateTransitionWASM => {
  const inputs = [new InputAddressWASM(sourceAddress, sourceNonce + 1, amountCredits)]
  const outputs = [new OutputAddressWASM(toAddress, amountCredits)]
  const feeStrategy = [AddressFundsFeeStrategyStepWASM.DeductFromInput(0)]

  const transition = new AddressFundsTransferTransitionWASM(inputs, feeStrategy, 0, [], outputs)
  const signature = sourcePrivateKey.sign(transition.toStateTransition().getSignableBytes())

  transition.inputWitness = [AddressWitnessWASM.P2PKH(signature)]

  return transition.toStateTransition()
}

// Builds an unsigned identity -> platform address credit transfer, used to fund a
// platform address from an identity's credit balance. `nonce` must be the
// identity's next nonce (current + 1); sign the returned ST with the identity key.
export const buildIdentityCreditTransferToAddress = (identityId: string, toAddress: string, amountCredits: bigint, nonce: bigint): StateTransitionWASM => {
  const recipients = [new OutputAddressWASM(toAddress, amountCredits)]
  const transition = new IdentityCreditTransferToAddressesTransitionWASM(identityId, recipients, nonce, 0)

  return transition.toStateTransition()
}
