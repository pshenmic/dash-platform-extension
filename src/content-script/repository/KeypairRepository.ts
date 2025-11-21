import { StorageAdapter } from '../storage/storageAdapter'
import { IdentityPublicKeyWASM, PrivateKeyWASM } from 'pshenmic-dpp'
import { KeyPair } from '../../types'
import { KeyPairSchema, KeyPairsSchema } from '../storage/storageSchema'
import { bytesToHex, hexToBytes } from '../../utils'
import { encrypt } from 'eciesjs'
import { DashPlatformSDK } from 'dash-platform-sdk'

export class KeypairRepository {
  storageAdapter: StorageAdapter
  sdk: DashPlatformSDK

  constructor (storageAdapter: StorageAdapter, sdk: DashPlatformSDK) {
    this.storageAdapter = storageAdapter
    this.sdk = sdk
  }

  async add (identity: string, privateKey: string, keyId: number, pending: boolean = false): Promise<void> {
    const network = await this.storageAdapter.get('network') as string
    const walletId = await this.storageAdapter.get('currentWalletId') as string | null

    if (walletId == null) {
      throw new Error('Wallet is not chosen')
    }

    if (!pending) {
      const [identityPublicKey] = await this.sdk.identities.getIdentityPublicKeys(identity, [keyId])

      if (PrivateKeyWASM.fromHex(privateKey, network).getPublicKeyHash() !== identityPublicKey.getPublicKeyHash()) {
        throw new Error('Private key does not match Identity Public Key')
      }
    }

    const passwordPublicKey = await this.storageAdapter.get('passwordPublicKey') as string | null

    if (passwordPublicKey == null) {
      throw new Error('Password is not set for an extension')
    }

    const storageKey = `keyPairs_${network}_${walletId}`

    const keyPairsSchema = (await this.storageAdapter.get(storageKey) ?? {}) as KeyPairsSchema

    let keyPairs: KeyPairSchema[] = keyPairsSchema[identity]

    if (keyPairs == null || keyPairs.length === 0) {
      keyPairs = []
    }

    const keyPairSchema: KeyPairSchema = {
      encryptedPrivateKey: bytesToHex(encrypt(passwordPublicKey, hexToBytes(privateKey))),
      keyId,
      pending
    }

    keyPairs.push(keyPairSchema)

    keyPairsSchema[identity] = keyPairs

    await this.storageAdapter.set(storageKey, keyPairsSchema)
  }

  async remove (identity: string, keyId: number): Promise<void> {
    const network = await this.storageAdapter.get('network') as string
    const walletId = await this.storageAdapter.get('currentWalletId') as string | null

    if (walletId == null) {
      throw new Error('Wallet is not chosen')
    }

    const storageKey = `keyPairs_${network}_${walletId}`

    const keyPairsSchema = (await this.storageAdapter.get(storageKey) ?? {}) as KeyPairsSchema

    let keyPairs: KeyPairSchema[] = keyPairsSchema[identity]

    if (keyPairs == null || keyPairs.length === 0) {
      keyPairs = []
    }

    keyPairs = keyPairs.filter((keyPair) => keyPair.keyId !== keyId)

    keyPairsSchema[identity] = keyPairs

    await this.storageAdapter.set(storageKey, keyPairsSchema)
  }

  async getByIdentityPublicKey (identifier: string, identityPublicKey: IdentityPublicKeyWASM): Promise<KeyPair | null> {
    const network = await this.storageAdapter.get('network') as string
    const walletId = await this.storageAdapter.get('currentWalletId') as string | null

    if (walletId == null) {
      throw new Error('Wallet is not chosen')
    }

    const storageKey = `keyPairs_${network}_${walletId}`

    const keyPairsSchema = (await this.storageAdapter.get(storageKey) ?? {}) as KeyPairsSchema

    const keyPairs = keyPairsSchema[identifier]

    if (keyPairs == null || keyPairs.length === 0) {
      return null
    }

    const [keyPair] = (await Promise.all(keyPairs
      .map(async (keyPairSchema: KeyPairSchema) => {
        const [identityPublicKey] = await this.sdk.identities.getIdentityPublicKeys(identifier, [keyPairSchema.keyId])

        return {
          keyId: keyPairSchema.keyId,
          keyType: identityPublicKey.keyTypeNumber,
          securityLevel: identityPublicKey.securityLevelNumber,
          purpose: identityPublicKey.purposeNumber,
          publicKeyHash: identityPublicKey.getPublicKeyHash(),
          encryptedPrivateKey: keyPairSchema.encryptedPrivateKey
        }
      })))
      .filter((keypair) => keypair.publicKeyHash === identityPublicKey.getPublicKeyHash())

    if (keyPair != null) {
      return keyPair
    }

    return null
  }

  async unmarkPending (identifier: string, keyId: number): Promise<KeyPair | null> {
    const network = await this.storageAdapter.get('network') as string
    const walletId = await this.storageAdapter.get('currentWalletId') as string | null

    if (walletId == null) {
      throw new Error('Wallet is not chosen')
    }

    const storageKey = `keyPairs_${network}_${walletId}`

    const keyPairsSchema = (await this.storageAdapter.get(storageKey) ?? {}) as KeyPairsSchema

    const keyPairs = (keyPairsSchema[identifier] ?? []).map(keyPairsSchema => {
      return { ...keyPairsSchema, pending: keyPairsSchema.keyId === keyId ? false : keyPairsSchema.pending }
    })

    keyPairsSchema[identifier] = keyPairs

    await this.storageAdapter.set(storageKey, keyPairsSchema)

    return null
  }

  async getAllByIdentity (identifier: string): Promise<KeyPair[]> {
    const network = await this.storageAdapter.get('network') as string
    const walletId = await this.storageAdapter.get('currentWalletId') as string | null

    if (walletId == null) {
      throw new Error('Wallet is not chosen')
    }

    const storageKey = `keyPairs_${network}_${walletId}`

    const keyPairsSchema = (await this.storageAdapter.get(storageKey) ?? {}) as KeyPairsSchema

    const keyPairs = keyPairsSchema[identifier]

    if (keyPairs == null || keyPairs.length === 0) {
      return []
    }

    return await Promise.all(keyPairs.map(async (keyPair) => {
      const [identityPublicKey] = await this.sdk.identities.getIdentityPublicKeys(identifier, [keyPair.keyId])

      return {
        keyId: keyPair.keyId,
        keyType: identityPublicKey.keyTypeNumber,
        securityLevel: identityPublicKey.securityLevelNumber,
        purpose: identityPublicKey.purposeNumber,
        publicKeyHash: identityPublicKey.getPublicKeyHash(),
        encryptedPrivateKey: keyPair.encryptedPrivateKey
      }
    }))
  }
}
