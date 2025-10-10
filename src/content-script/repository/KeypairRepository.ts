import { StorageAdapter } from '../storage/storageAdapter'
import { IdentityPublicKeyWASM, PrivateKeyWASM } from 'pshenmic-dpp'
import { KeyPair } from '../../types'
import { base64 } from '@scure/base'
import { KeyPairSchema, KeyPairsSchema } from '../storage/storageSchema'
import { bytesToHex, hexToBytes } from '../../utils'
import { encrypt } from 'eciesjs'

export class KeypairRepository {
  storageAdapter: StorageAdapter

  constructor (storageAdapter: StorageAdapter) {
    this.storageAdapter = storageAdapter
  }

  async add (identity: string, privateKey: string, identityPublicKey: IdentityPublicKeyWASM): Promise<void> {
    const network = await this.storageAdapter.get('network') as string
    const walletId = await this.storageAdapter.get('currentWalletId') as string | null

    if (walletId == null) {
      throw new Error('Wallet is not chosen')
    }

    if (PrivateKeyWASM.fromHex(privateKey, network).getPublicKeyHash() !== identityPublicKey.getPublicKeyHash()) {
      throw new Error('Private key does not match Identity Public Key')
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
      identityPublicKey: base64.encode(identityPublicKey.bytes())
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

    keyPairs = keyPairs.filter((keyPair) => IdentityPublicKeyWASM.fromBase64(keyPair.identityPublicKey).keyId !== keyId)

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

    const [keyPair] = keyPairs
      .map((keyPairSchema: KeyPairSchema) => ({
        identityPublicKey: IdentityPublicKeyWASM.fromBytes(base64.decode(keyPairSchema.identityPublicKey)),
        encryptedPrivateKey: keyPairSchema.encryptedPrivateKey
      }))
      .filter((keypair: KeyPair) => keypair.identityPublicKey.getPublicKeyHash() === identityPublicKey.getPublicKeyHash())

    if (keyPair != null) {
      return keyPair
    }

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

    return keyPairs.map((keyPair) => ({
      identityPublicKey: IdentityPublicKeyWASM.fromBase64(keyPair.identityPublicKey),
      encryptedPrivateKey: keyPair.encryptedPrivateKey
    }))
  }
}
