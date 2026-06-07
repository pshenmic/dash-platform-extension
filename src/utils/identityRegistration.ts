import type { DashPlatformSDK } from 'dash-platform-sdk'
import { PrivateKeyWASM, StateTransitionWASM } from 'dash-platform-sdk/types'
import type { AssetLockProof } from '../types/AssetLockProof'

// SDK 1.4 exports Purpose/SecurityLevel/KeyType as `const enum`s, which ts-jest
// erases to `undefined` at runtime — local numeric aliases keep them readable and runtime-safe.
const Purpose = { AUTHENTICATION: 0, ENCRYPTION: 1, DECRYPTION: 2, TRANSFER: 3 } as const
const SecurityLevel = { MASTER: 0, CRITICAL: 1, HIGH: 2, MEDIUM: 3 } as const
const KeyType = { ECDSA_SECP256K1: 0 } as const

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
