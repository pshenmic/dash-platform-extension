import type { DashPlatformSDK } from 'dash-platform-sdk'
import { KeyType, Purpose, SecurityLevel, PrivateKeyWASM, StateTransitionWASM } from 'dash-platform-sdk/types'
import {
  InputAddressWASM,
  AddressFundsFeeStrategyStepWASM,
  AddressWitnessWASM,
  IdentityCreateFromAddressesTransitionWASM,
  IdentityPublicKeyInCreationWASM
} from 'pshenmic-dpp'
import type { AssetLockProof } from '../types/AssetLockProof'

// Protocol limits IdentityCreateTransition to 6 public keys. AUTH MEDIUM is
// dropped (used only for routine background transitions, can be added later
// via IdentityUpdateTransition); MASTER/CRITICAL/HIGH cover the common path.
export const IDENTITY_KEY_DEFINITIONS = [
  { id: 0, purpose: Purpose.AUTHENTICATION, securityLevel: SecurityLevel.MASTER, keyType: KeyType.ECDSA_SECP256K1 },
  { id: 1, purpose: Purpose.AUTHENTICATION, securityLevel: SecurityLevel.CRITICAL, keyType: KeyType.ECDSA_SECP256K1 },
  { id: 2, purpose: Purpose.AUTHENTICATION, securityLevel: SecurityLevel.HIGH, keyType: KeyType.ECDSA_SECP256K1 },
  { id: 3, purpose: Purpose.ENCRYPTION, securityLevel: SecurityLevel.MEDIUM, keyType: KeyType.ECDSA_SECP256K1 },
  { id: 4, purpose: Purpose.DECRYPTION, securityLevel: SecurityLevel.MEDIUM, keyType: KeyType.ECDSA_SECP256K1 },
  { id: 5, purpose: Purpose.TRANSFER, securityLevel: SecurityLevel.CRITICAL, keyType: KeyType.ECDSA_SECP256K1 }
] as const

/**
 * Builds and signs an identity create state transition.
 *
 * Two-pass signing:
 *  1. Sign with each identity key to produce proof-of-possession signatures.
 *     Each signByPrivateKey overwrites the same WASM memory — copy out immediately.
 *  2. Re-create the ST with signed keys, then sign with the funding key.
 */
export const buildIdentityCreateTransition = (
  identityPrivateKeys: PrivateKeyWASM[],
  identityRegistrationKey: PrivateKeyWASM,
  assetLockProof: AssetLockProof,
  sdk: DashPlatformSDK
): StateTransitionWASM => {
  const identityPublicKeysInCreation = IDENTITY_KEY_DEFINITIONS.map(({ id, purpose, securityLevel, keyType }, i) => ({
    id,
    purpose,
    securityLevel,
    keyType,
    readOnly: false,
    data: Uint8Array.from(identityPrivateKeys[i].getPublicKey().bytes()),
    signature: undefined as Uint8Array | undefined
  }))

  let stateTransition = sdk.identities.createStateTransition('create', {
    publicKeys: identityPublicKeysInCreation,
    assetLockProof
  })

  for (let i = 0; i < identityPrivateKeys.length; i++) {
    stateTransition.signByPrivateKey(identityPrivateKeys[i], undefined, IDENTITY_KEY_DEFINITIONS[i].keyType)
    if (stateTransition.signature == null) {
      throw new Error(`signByPrivateKey did not produce a signature for identity key ${i}`)
    }
    identityPublicKeysInCreation[i].signature = Uint8Array.from(stateTransition.signature)
  }

  stateTransition = sdk.identities.createStateTransition('create', {
    publicKeys: identityPublicKeysInCreation,
    assetLockProof
  })

  stateTransition.signByPrivateKey(identityRegistrationKey, undefined, KeyType.ECDSA_SECP256K1)

  return stateTransition
}

/**
 * Builds and signs an IdentityCreateFromAddresses state transition — registers a
 * new identity funded from a platform address instead of an L1 asset lock.
 *
 * Same two-pass identity-key signing as buildIdentityCreateTransition, but the
 * funding proof is the source address witness (P2PKH) rather than a funding-key
 * signature over the whole ST.
 */
export const buildSignedIdentityCreateFromAddress = (
  sdk: DashPlatformSDK,
  identityPrivateKeys: PrivateKeyWASM[],
  sourceAddress: string,
  sourceNonce: number,
  amountCredits: bigint,
  sourceAddressPrivateKey: PrivateKeyWASM
): StateTransitionWASM => {
  const inputs = [new InputAddressWASM(sourceAddress, sourceNonce + 1, amountCredits)]
  const feeStrategy = [AddressFundsFeeStrategyStepWASM.DeductFromInput(0)]

  const keys = IDENTITY_KEY_DEFINITIONS.map(({ id, purpose, securityLevel, keyType }, i) =>
    new IdentityPublicKeyInCreationWASM(id, purpose, securityLevel, keyType, false, Uint8Array.from(identityPrivateKeys[i].getPublicKey().bytes()))
  )

  // Pass 1: collect a proof-of-possession signature from each identity key.
  // signByPrivateKey RETURNS the signature bytes (it does not populate the ST's
  // `.signature` for this transition type) — use the return value.
  const proofOfPossessionSt = sdk.platformAddresses.createStateTransition('identityCreateFromAddresses', {
    publicKeys: keys, inputs, feeStrategy, userFeeIncrease: 0, inputWitness: []
  })

  for (let i = 0; i < identityPrivateKeys.length; i++) {
    const signature = proofOfPossessionSt.signByPrivateKey(identityPrivateKeys[i], undefined, IDENTITY_KEY_DEFINITIONS[i].keyType)

    if (signature == null || signature.length === 0) {
      throw new Error(`signByPrivateKey did not produce a signature for identity key ${i}`)
    }

    keys[i].signature = Uint8Array.from(signature)
  }

  // Pass 2: rebuild with signed keys, then fund with the source address witness.
  const unsignedSt = sdk.platformAddresses.createStateTransition('identityCreateFromAddresses', {
    publicKeys: keys, inputs, feeStrategy, userFeeIncrease: 0, inputWitness: []
  })
  const addressSignature = sourceAddressPrivateKey.sign(unsignedSt.getSignableBytes())

  const transition = IdentityCreateFromAddressesTransitionWASM.fromStateTransition(unsignedSt)
  transition.inputWitness = [AddressWitnessWASM.P2PKH(addressSignature)]

  return transition.toStateTransition()
}
