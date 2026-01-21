import { IdentitiesRepository } from '../../../repository/IdentitiesRepository'
import { EventData } from '../../../../types'
import { APIHandler } from '../../APIHandler'
import { PrivateKeyWASM } from 'dash-platform-sdk/src/types'
import { WalletRepository } from '../../../repository/WalletRepository'
import { KeypairRepository } from '../../../repository/KeypairRepository'
import { validateHex } from '../../../../utils'
import { VoidResponse } from '../../../../types/messages/response/VoidResponse'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { AddIdentityPrivateKeyPayload } from '../../../../types/messages/payloads/AddIdentityPrivateKeyPayload'

export class AddIdentityPrivateKey implements APIHandler {
  keypairRepository: KeypairRepository
  identitiesRepository: IdentitiesRepository
  walletRepository: WalletRepository
  sdk: DashPlatformSDK

  constructor (identitiesRepository: IdentitiesRepository, walletRepository: WalletRepository, keypairRepository: KeypairRepository, sdk: DashPlatformSDK) {
    this.identitiesRepository = identitiesRepository
    this.keypairRepository = keypairRepository
    this.walletRepository = walletRepository
    this.sdk = sdk
  }

  async handle (event: EventData): Promise<VoidResponse> {
    const payload: AddIdentityPrivateKeyPayload = event.payload
    const privateKey = payload.privateKey
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }

    if (wallet.type !== 'keystore') {
      throw new Error('Adding private key only possible in keystore wallet mode')
    }

    const publicKeyHash = PrivateKeyWASM.fromHex(payload.privateKey, wallet.network).getPublicKeyHash()

    // check identity exists
    const identity = await this.identitiesRepository.getByIdentifier(payload.identity)

    if (identity == null) {
      throw new Error(`Identity with identifier ${payload.identity} not found`)
    }

    // check that such private key not already exists
    const keyPairs = await this.keypairRepository.getAllByIdentity(payload.identity)
    const [existingKeyPair] = keyPairs.filter(keyPair => keyPair.publicKeyHash === publicKeyHash)

    if (existingKeyPair != null) {
      throw new Error('That private key already exists for this identity')
    }

    const identityPublicKeys = await this.sdk.identities.getIdentityPublicKeys(payload.identity)
    const [identityPublicKey] = identityPublicKeys.filter(identityPublicKey => identityPublicKey.getPublicKeyHash() === publicKeyHash)

    // check if private key belongs to any of identity public keys
    if (identityPublicKey == null) {
      throw new Error('No Identity Public Key known in network matching this private key')
    }

    await this.keypairRepository.add(payload.identity, privateKey, identityPublicKey.keyId)

    return {}
  }

  validatePayload (payload: AddIdentityPrivateKeyPayload): string | null {
    if (!this.sdk.utils.validateIdentifier(payload.identity)) {
      return 'Could not decode identity identifier'
    }

    if (payload.privateKey == null) {
      return 'Private key is missing'
    }

    if (!validateHex(payload.privateKey)) {
      return 'Private key should be in hex format'
    }

    return null
  }
}
