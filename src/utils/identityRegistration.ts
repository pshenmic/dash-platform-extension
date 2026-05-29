import type { DashPlatformSDK } from 'dash-platform-sdk'
import { PrivateKeyWASM, StateTransitionWASM } from 'dash-platform-sdk/types'
import type { AssetLockProof } from '../types/AssetLockProof'

// Numeric literals instead of `Purpose.AUTHENTICATION` etc. because SDK 1.4
// re-exports these as `const enum` — webpack inlines them at build time, but
// ts-jest sees the imported binding as `undefined` at runtime. The literal
// numbers ARE the const-enum values (Purpose.AUTHENTICATION = 0 etc.), so
// assignability to the `Purpose | SecurityLevel | KeyType` field types holds.
//
// Purpose:        AUTHENTICATION = 0, ENCRYPTION = 1, DECRYPTION = 2, TRANSFER = 3
// SecurityLevel:  MASTER = 0, CRITICAL = 1, HIGH = 2, MEDIUM = 3
// KeyType:        ECDSA_SECP256K1 = 0
//
// Protocol limits IdentityCreateTransition to 6 public keys. AUTH MEDIUM is
// dropped (used only for routine background transitions, can be added later
// via IdentityUpdateTransition); MASTER/CRITICAL/HIGH cover the common path.
export const IDENTITY_KEY_DEFINITIONS = [
  { id: 0, purpose: 0, securityLevel: 0, keyType: 0 }, // AUTH + MASTER
  { id: 1, purpose: 0, securityLevel: 1, keyType: 0 }, // AUTH + CRITICAL
  { id: 2, purpose: 0, securityLevel: 2, keyType: 0 }, // AUTH + HIGH
  { id: 3, purpose: 1, securityLevel: 3, keyType: 0 }, // ENCRYPTION + MEDIUM
  { id: 4, purpose: 2, securityLevel: 3, keyType: 0 }, // DECRYPTION + MEDIUM
  { id: 5, purpose: 3, securityLevel: 1, keyType: 0 } // TRANSFER + CRITICAL
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

  stateTransition.signByPrivateKey(identityRegistrationKey, undefined, 0) // ECDSA_SECP256K1

  return stateTransition
}
