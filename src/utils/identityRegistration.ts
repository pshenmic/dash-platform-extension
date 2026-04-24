import type { DashPlatformSDK } from 'dash-platform-sdk'
import { KeyType, Purpose, SecurityLevel, PrivateKeyWASM, StateTransitionWASM } from 'dash-platform-sdk/types'
import type { AssetLockProof } from '../types/AssetLock'

export const IDENTITY_KEY_DEFINITIONS = [
  { id: 0, purpose: Purpose.AUTHENTICATION, securityLevel: SecurityLevel.MASTER },
  { id: 1, purpose: Purpose.AUTHENTICATION, securityLevel: SecurityLevel.HIGH },
  { id: 2, purpose: Purpose.ENCRYPTION, securityLevel: SecurityLevel.MEDIUM },
  { id: 3, purpose: Purpose.TRANSFER, securityLevel: SecurityLevel.CRITICAL }
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
  const identityPublicKeysInCreation = IDENTITY_KEY_DEFINITIONS.map(({ id, purpose, securityLevel }, i) => ({
    id,
    purpose,
    securityLevel,
    keyType: KeyType.ECDSA_SECP256K1,
    readOnly: false,
    data: Uint8Array.from(identityPrivateKeys[i].getPublicKey().bytes()),
    signature: undefined as Uint8Array | undefined
  }))

  let stateTransition = sdk.identities.createStateTransition('create', {
    publicKeys: identityPublicKeysInCreation,
    assetLockProof
  })

  for (let i = 0; i < identityPrivateKeys.length; i++) {
    stateTransition.signByPrivateKey(identityPrivateKeys[i], undefined, KeyType.ECDSA_SECP256K1)
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
