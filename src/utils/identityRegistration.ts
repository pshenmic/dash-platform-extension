import type { DashPlatformSDK } from 'dash-platform-sdk'
import { KeyType, Purpose, SecurityLevel, PrivateKeyWASM, StateTransitionWASM } from 'dash-platform-sdk/types'
import type { AssetLockProof } from '../types/AssetLockProof'

export const IDENTITY_KEY_DEFINITIONS = [
  { id: 0, purpose: Purpose.AUTHENTICATION, securityLevel: SecurityLevel.MASTER, keyType: KeyType.ECDSA_SECP256K1 },
  { id: 1, purpose: Purpose.AUTHENTICATION, securityLevel: SecurityLevel.CRITICAL, keyType: KeyType.ECDSA_SECP256K1 },
  { id: 2, purpose: Purpose.AUTHENTICATION, securityLevel: SecurityLevel.HIGH, keyType: KeyType.ECDSA_SECP256K1 },
  { id: 3, purpose: Purpose.AUTHENTICATION, securityLevel: SecurityLevel.MEDIUM, keyType: KeyType.ECDSA_SECP256K1 },
  { id: 4, purpose: Purpose.ENCRYPTION, securityLevel: SecurityLevel.HIGH, keyType: KeyType.ECDSA_SECP256K1 },
  { id: 5, purpose: Purpose.DECRYPTION, securityLevel: SecurityLevel.MEDIUM, keyType: KeyType.ECDSA_SECP256K1 },
  { id: 6, purpose: Purpose.TRANSFER, securityLevel: SecurityLevel.CRITICAL, keyType: KeyType.ECDSA_SECP256K1 }
] as const

const getPublicKeyData = (privateKey: PrivateKeyWASM, keyType: KeyType): Uint8Array => {
  if (keyType === KeyType.ECDSA_HASH160) {
    return Uint8Array.from(privateKey.getPublicKey().hash160())
  }

  if (keyType === KeyType.ECDSA_SECP256K1) {
    return Uint8Array.from(privateKey.getPublicKey().bytes())
  }

  throw new Error(`Unsupported identity key type ${keyType}`)
}

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
    data: getPublicKeyData(identityPrivateKeys[i], keyType),
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
