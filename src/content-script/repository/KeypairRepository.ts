import { StorageAdapter } from '../storage/storageAdapter'
import { Identity, KeyPair, Wallet, WalletType } from '../../types'
import { IdentityPublicKeyWASM, PrivateKeyWASM } from 'dash-platform-sdk/types'
import { KeyPairSchema, KeyPairsSchema } from '../storage/storageSchema'
import { bytesToHex, deriveKeystorePrivateKey, deriveSeedphrasePrivateKey, hexToBytes } from '../../utils'
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

  // derives the private key from seedphrase or gets it from the storage for keypair wallets or throws an error
  async getPrivateKeyFromWallet (wallet: Wallet, identity: Identity, keyId: number, password: string): Promise<PrivateKeyWASM> {
    if (wallet.type === WalletType.keystore) {
      return await deriveKeystorePrivateKey(wallet, password, identity.identifier, keyId, this)
    } else if (wallet.type === WalletType.seedphrase) {
      return await deriveSeedphrasePrivateKey(wallet, password, identity.index, keyId, this.sdk)
    } else {
      throw new Error('Unsupported wallet type')
    }
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
          encryptedPrivateKey: keyPairSchema.encryptedPrivateKey,
          pending: keyPairSchema.pending
        }
      })))
      .filter((keypair) => keypair.publicKeyHash === identityPublicKey.getPublicKeyHash())

    if (keyPair != null) {
      return keyPair
    }

    return null
  }

  async isExisting (identifier: string, keyId: number): Promise<boolean> {
    const network = await this.storageAdapter.get('network') as string
    const walletId = await this.storageAdapter.get('currentWalletId') as string | null

    if (walletId == null) {
      throw new Error('Wallet is not chosen')
    }

    const storageKey = `keyPairs_${network}_${walletId}`

    const keyPairsSchema = (await this.storageAdapter.get(storageKey) ?? {}) as KeyPairsSchema

    const keyPairs = keyPairsSchema[identifier]

    if (keyPairs == null || keyPairs.length === 0) {
      return false
    }

    return keyPairs.some((keypair) => keypair.keyId === keyId)
  }

  async getByIdentityAndKeyId (identifier: string, keyId: number): Promise<KeyPair | null> {
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
          encryptedPrivateKey: keyPairSchema.encryptedPrivateKey,
          pending: keyPairSchema.pending
        }
      })))
      .filter((keypair) => keypair.keyId === keyId)

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

  async getAllByIdentity (identifier: string, pending: boolean = false): Promise<KeyPair[]> {
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

    return await Promise.all(keyPairs
      .filter(keyPair => keyPair.pending === pending)
      .map(async (keyPair) => {
        const [identityPublicKey] = await this.sdk.identities.getIdentityPublicKeys(identifier, [keyPair.keyId])

        return {
          keyId: keyPair.keyId,
          keyType: identityPublicKey.keyTypeNumber,
          securityLevel: identityPublicKey.securityLevelNumber,
          purpose: identityPublicKey.purposeNumber,
          publicKeyHash: identityPublicKey.getPublicKeyHash(),
          encryptedPrivateKey: keyPair.encryptedPrivateKey,
          pending: keyPair.pending
        }
      }))
  }

  async getEncryptedPrivateKey (identifier: string, keyId: number): Promise<string> {
    const network = await this.storageAdapter.get('network') as string
    const walletId = await this.storageAdapter.get('currentWalletId') as string | null

    if (walletId == null) {
      throw new Error('Wallet is not chosen')
    }

    const storageKey = `keyPairs_${network}_${walletId}`

    const keyPairsSchema = (await this.storageAdapter.get(storageKey) ?? {}) as KeyPairsSchema

    const keyPairs = keyPairsSchema[identifier]

    const [encryptedPrivateKey] = keyPairs
      .filter(keyPair => keyPair.keyId === keyId)
      .map((keyPair) => (keyPair.encryptedPrivateKey))

    if (encryptedPrivateKey == null) {
      throw new Error(`Could not find encrypted key for Identity ${identifier} and KeyID ${keyId}`)
    }

    return encryptedPrivateKey
  }
}
