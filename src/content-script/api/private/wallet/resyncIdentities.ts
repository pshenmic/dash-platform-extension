import { IdentitiesRepository } from '../../../repository/IdentitiesRepository'
import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { ResyncIdentitiesPayload } from '../../../../types/messages/payloads/ResyncIdentitiesPayload'
import { ResyncIdentitiesResponse } from '../../../../types/messages/response/ResyncIdentitiesResponse'
import { WalletType } from '../../../../types/WalletType'
import { decrypt, PrivateKey } from 'eciesjs'
import { bytesToUtf8, fetchIdentitiesBySeed, hexToBytes } from '../../../../utils'
import { StorageAdapter } from '../../../storage/storageAdapter'
import hash from 'hash.js'
import { Network } from '../../../../types/enums/Network'
import * as bip39 from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english'

export class ResyncIdentitiesHandler implements APIHandler {
  identitiesRepository: IdentitiesRepository
  walletRepository: WalletRepository
  storageAdapter: StorageAdapter
  sdk: DashPlatformSDK

  constructor (identitiesRepository: IdentitiesRepository, walletRepository: WalletRepository, sdk: DashPlatformSDK, storageAdapter: StorageAdapter) {
    this.identitiesRepository = identitiesRepository
    this.walletRepository = walletRepository
    this.storageAdapter = storageAdapter
    this.sdk = sdk
  }

  async handle (event: EventData): Promise<ResyncIdentitiesResponse> {
    const payload: ResyncIdentitiesPayload = event.payload
    const wallet = await this.walletRepository.getCurrent()
    const network = await this.storageAdapter.get('network') as string

    if (wallet == null) {
      throw new Error('Wallet is not chosen')
    }

    if (wallet.type === WalletType.keystore) {
      throw new Error('Resync identities is not available for keystore wallets')
    }

    if (wallet.encryptedMnemonic == null) {
      throw new Error('Encrypted mnemonic not set for seedphrase wallet')
    }

    if (payload.mnemonic != null && hash.sha256().update(payload.mnemonic).digest('hex') !== wallet.seedHash) {
      throw new Error('Mnemonic provided does not belong to this wallet')
    }

    let seed

    if (payload.mnemonic != null) {
      seed = await this.sdk.keyPair.mnemonicToSeed(payload.mnemonic, undefined, true)
    }

    if (payload.password != null) {
      const passwordHash = hash.sha256().update(payload.password).digest('hex')
      const secretKey = PrivateKey.fromHex(passwordHash)

      let mnemonic

      try {
        mnemonic = bytesToUtf8(decrypt(secretKey.toHex(), hexToBytes(wallet.encryptedMnemonic)))
      } catch (e) {
        throw new Error('Failed to decrypt')
      }

      seed = await this.sdk.keyPair.mnemonicToSeed(mnemonic, undefined, true)
    }

    const identities = await fetchIdentitiesBySeed(seed, this.sdk, Network[network])

    await this.identitiesRepository.replaceAll(identities.map((identity, index) => ({ identifier: identity.id.base58(), index, label: null })))

    return { identitiesCount: identities.length }
  }

  validatePayload (payload: ResyncIdentitiesPayload): string | null {
    if ((payload.password == null && payload.mnemonic) == null ||
        (payload.password != null && payload.mnemonic != null)) {
      return 'Either password or mnemonic must be provided'
    }

    if (payload.mnemonic != null && !bip39.validateMnemonic(payload.mnemonic, wordlist)) {
      return 'Mnemonic seed phrase is not valid'
    }

    return null
  }
}
