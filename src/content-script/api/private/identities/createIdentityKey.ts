import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { StorageAdapter } from '../../../storage/storageAdapter'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { WalletType } from '../../../../types/WalletType'
import { decrypt, PrivateKey } from 'eciesjs'
import { bytesToUtf8, hexToBytes } from '../../../../utils'
import hash from 'hash.js'
import { Network } from '../../../../types/enums/Network'
import { PrivateKeyWASM } from 'pshenmic-dpp'
import type { CreateIdentityKeyPayload } from '../../../../types/messages/payloads/CreateIdentityKeyPayload'
import type { CreateIdentityKeyResponse } from '../../../../types/messages/response/CreateIdentityKeyResponse'
import { IdentitiesRepository } from '../../../repository/IdentitiesRepository'

export class CreateIdentityKeyHandler implements APIHandler {
  walletRepository: WalletRepository
  identitiesRepository: IdentitiesRepository
  storageAdapter: StorageAdapter
  sdk: DashPlatformSDK

  constructor (walletRepository: WalletRepository, identitiesRepository: IdentitiesRepository, storageAdapter: StorageAdapter, sdk: DashPlatformSDK) {
    this.walletRepository = walletRepository
    this.identitiesRepository = identitiesRepository
    this.storageAdapter = storageAdapter
    this.sdk = sdk
  }

  async handle (event: EventData): Promise<CreateIdentityKeyResponse> {
    const payload: CreateIdentityKeyPayload = event.payload
    const wallet = await this.walletRepository.getCurrent()
    const network = await this.storageAdapter.get('network') as string

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }

    let privateKeyHex: string

    if (wallet.type === WalletType.seedphrase) {
      // For seed phrase wallets: derive key from seed phrase
      if (wallet.encryptedMnemonic == null) {
        throw new Error('Encrypted mnemonic not set for seedphrase wallet')
      }

      // Check password is provided for seedphrase wallets
      if (payload.password == null || payload.password.length === 0) {
        throw new Error('Password is required for seed phrase wallets')
      }

      // Decrypt the mnemonic using the password
      const passwordHash = hash.sha256().update(payload.password).digest('hex')
      const secretKey = PrivateKey.fromHex(passwordHash)

      let mnemonic: string
      try {
        mnemonic = bytesToUtf8(decrypt(secretKey.toHex(), hexToBytes(wallet.encryptedMnemonic)))
      } catch (e) {
        throw new Error('Failed to decrypt mnemonic. Please check your password.')
      }

      // Convert mnemonic to seed
      const seed = this.sdk.keyPair.mnemonicToSeed(mnemonic)

      // Convert seed to HDKey
      const hdKey = this.sdk.keyPair.seedToHdKey(seed, Network[network])

      // Get the identity data to find the identity index
      const identity = await this.identitiesRepository.getByIdentifier(payload.identity)
      
      if (identity?.index == null) {
        throw new Error('Identity index not found. Cannot derive key from seed phrase.')
      }

      // Get current keys to determine next key index
      const identityPublicKeys = await this.sdk.identities.getIdentityPublicKeys(payload.identity)
      const maxKeyId = identityPublicKeys.reduce((max, key) => Math.max(max, key.keyId), -1)
      const nextKeyIndex = maxKeyId + 1

      // Derive the identity private key
      const derivedHdKey = this.sdk.keyPair.deriveIdentityPrivateKey(hdKey, identity.index, nextKeyIndex, Network[network])
      
      if (derivedHdKey.privateKey == null) {
        throw new Error('Failed to derive private key from seed phrase')
      }

      // Convert to hex
      const privateKeyWASM = PrivateKeyWASM.fromBytes(derivedHdKey.privateKey, Network[network])
      privateKeyHex = privateKeyWASM.hex()
    } else {
      // For keystore wallets: generate random private key
      const privateKeyBytes = new Uint8Array(32)
      crypto.getRandomValues(privateKeyBytes)
      
      const privateKeyWASM = PrivateKeyWASM.fromBytes(privateKeyBytes, Network[network])
      privateKeyHex = privateKeyWASM.hex()
    }

    return {
      privateKey: privateKeyHex,
      walletType: wallet.type
    }
  }

  validatePayload (payload: CreateIdentityKeyPayload): string | null {
    if (typeof payload.identity !== 'string' || payload.identity.length === 0) {
      return 'Identity identifier must be provided'
    }

    return null
  }
}

