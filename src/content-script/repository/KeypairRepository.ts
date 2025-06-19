import { StorageAdapter } from '../storage/storageAdapter'
import { IdentityPublicKeyWASM, DashPlatformProtocolWASM } from 'pshenmic-dpp'
import { KeyPair } from '../../types/KeyPair'
import { base64 } from '@scure/base'
import { KeyPairSchema, KeyPairsSchema } from '../storage/storageSchema'
import { bytesToHex, hexToBytes } from '../../utils'
import { encrypt } from 'eciesjs'

export class KeypairRepository {
  storageAdapter: StorageAdapter
  dpp: DashPlatformProtocolWASM

  constructor (storageAdapter: StorageAdapter, dpp: DashPlatformProtocolWASM) {
    this.dpp = dpp
    this.storageAdapter = storageAdapter
  }

  async add (identity: string, privateKey: string, identityPublicKey: IdentityPublicKeyWASM): Promise<void> {
    const passwordPublicKey = await this.storageAdapter.get('passwordPublicKey') as string

    const network = await this.storageAdapter.get('network')
    const walletId = await this.storageAdapter.get('currentWalletId')

    const storageKey = `keypairs_${walletId}_${network}`

    const keyPairsSchema = (await this.storageAdapter.get(storageKey) ?? {}) as KeyPairsSchema

    let keyPairs: KeyPairSchema[] = keyPairsSchema[identity]

    if (!keyPairs?.length) {
      keyPairs = []
    }

    const keyPairSchema: KeyPairSchema = {
      encryptedPrivateKey: bytesToHex(encrypt(passwordPublicKey, hexToBytes(privateKey))),
      identityPublicKey: base64.encode(identityPublicKey.toBytes())
    }

    keyPairs.push(keyPairSchema)

    keyPairsSchema[identity] = keyPairs

    await this.storageAdapter.set(storageKey, keyPairsSchema)
  }

  async getByIdentityPublicKey (identifier: string, identityPublicKey: IdentityPublicKeyWASM): Promise<KeyPair | null> {
    const network = await this.storageAdapter.get('network')
    const walletId = await this.storageAdapter.get('currentWalletId')

    const storageKey = `keypairs_${walletId}_${network}`

    const keyPairsSchema = (await this.storageAdapter.get(storageKey) ?? {}) as KeyPairsSchema

    const keyPairs = keyPairsSchema[identifier]

    if (!keyPairs?.length) {
      return null
    }

    const [keyPair] = keyPairs
      .map((keyPairSchema: KeyPairSchema) => ({ identityPublicKey: this.dpp.IdentityPublicKeyWASM.fromBytes(base64.decode(keyPairSchema.identityPublicKey)) }))
      .filter((keypair: KeyPair) => keypair.identityPublicKey.getPublicKeyHash() === identityPublicKey.getPublicKeyHash())

    if (keyPair) {
      return keyPair
    }

    return null
  }
}
