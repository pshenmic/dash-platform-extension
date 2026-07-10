import {
  InputAddressWASM,
  OutputAddressWASM,
  AddressFundsFeeStrategyStepWASM,
  AddressFundsTransferTransitionWASM,
  AddressCreditWithdrawalTransitionWASM,
  AddressWitnessWASM,
  IdentityTopUpFromAddressesTransitionWASM,
  CoreScriptWASM,
  PrivateKeyWASM,
  StateTransitionWASM
} from 'pshenmic-dpp'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { MIN_OUTPUT_CREDITS, TRANSFER_FEE_CREDITS } from '../constants'

// Two-pass address-witness signing: the SDK's platformAddresses builder assembles
// the unsigned transition, we sign its signable bytes with the source address key,
// then re-attach the P2PKH witness via the transition class recovered from the
// unsigned state transition.
interface AddressWitnessTransition {
  inputWitness: AddressWitnessWASM[]
  toStateTransition: () => StateTransitionWASM
}

const signWithAddressWitness = <T extends AddressWitnessTransition>(
  unsignedSt: StateTransitionWASM,
  transitionClass: { fromStateTransition: (st: StateTransitionWASM) => T },
  sourcePrivateKey: PrivateKeyWASM
): StateTransitionWASM => {
  const signature = sourcePrivateKey.sign(unsignedSt.getSignableBytes())

  const transition = transitionClass.fromStateTransition(unsignedSt)
  transition.inputWitness = [AddressWitnessWASM.P2PKH(signature)]

  return transition.toStateTransition()
}

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
// deducted from the input. The SDK assembles the transition; we sign the signable
// bytes and attach a P2PKH witness.
export const buildSignedPlatformTransfer = (sdk: DashPlatformSDK, sourceAddress: string, sourceNonce: number, toAddress: string, amountCredits: bigint, sourcePrivateKey: PrivateKeyWASM): StateTransitionWASM => {
  const inputs = [new InputAddressWASM(sourceAddress, sourceNonce + 1, amountCredits)]
  const outputs = [new OutputAddressWASM(toAddress, amountCredits)]
  const feeStrategy = [AddressFundsFeeStrategyStepWASM.DeductFromInput(0)]

  const unsignedSt = sdk.platformAddresses.createStateTransition('addressFundsTransfer', {
    inputs, feeStrategy, userFeeIncrease: 0, inputWitness: [], outputs
  })

  return signWithAddressWitness(unsignedSt, AddressFundsTransferTransitionWASM, sourcePrivateKey)
}

// Builds an unsigned identity -> platform address credit transfer, used to fund a
// platform address from an identity's credit balance. `nonce` must be the
// identity's next nonce (current + 1); sign the returned ST with the identity key.
export const buildIdentityCreditTransferToAddress = (sdk: DashPlatformSDK, identityId: string, toAddress: string, amountCredits: bigint, nonce: bigint): StateTransitionWASM => {
  const recipients = [new OutputAddressWASM(toAddress, amountCredits)]

  return sdk.platformAddresses.createStateTransition('identityCreditTransferToAddresses', {
    identityId, recipients, nonce
  })
}

// Builds and signs an identity top-up from a platform address: spends `amount`
// from the source address (nonce + 1) and credits the target identity, with the
// fee deducted from the input. Signed with the source address key (P2PKH witness)
// — the target identity does not sign, so any identity can be topped up.
export const buildSignedIdentityTopUpFromAddress = (sdk: DashPlatformSDK, identityId: string, sourceAddress: string, sourceNonce: number, amountCredits: bigint, sourcePrivateKey: PrivateKeyWASM): StateTransitionWASM => {
  const inputs = [new InputAddressWASM(sourceAddress, sourceNonce + 1, amountCredits)]
  const feeStrategy = [AddressFundsFeeStrategyStepWASM.DeductFromInput(0)]

  const unsignedSt = sdk.platformAddresses.createStateTransition('identityTopUpFromAddresses', {
    identityId, inputs, feeStrategy, userFeeIncrease: 0, inputWitness: []
  })

  return signWithAddressWitness(unsignedSt, IdentityTopUpFromAddressesTransitionWASM, sourcePrivateKey)
}

// Builds and signs a withdrawal from a platform address to a Core (L1) script:
// spends `amount` from the source address (nonce + 1), and the platform produces
// the L1 transaction paying `outputScript`. Signed with the source address key.
export const buildSignedAddressWithdrawal = (sdk: DashPlatformSDK, outputScript: CoreScriptWASM, sourceAddress: string, sourceNonce: number, amountCredits: bigint, coreFeePerByte: number, pooling: 'Standard' | 'Never' | 'IfAvailable', sourcePrivateKey: PrivateKeyWASM): StateTransitionWASM => {
  const inputs = [new InputAddressWASM(sourceAddress, sourceNonce + 1, amountCredits)]
  const feeStrategy = [AddressFundsFeeStrategyStepWASM.DeductFromInput(0)]

  const unsignedSt = sdk.platformAddresses.createStateTransition('addressCreditWithdrawal', {
    inputs, feeStrategy, coreFeePerByte, pooling, outputScript, userFeeIncrease: 0, inputWitness: []
  })

  return signWithAddressWitness(unsignedSt, AddressCreditWithdrawalTransitionWASM, sourcePrivateKey)
}
