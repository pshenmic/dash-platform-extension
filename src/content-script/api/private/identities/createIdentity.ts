import { IdentitiesRepository } from '../../../repository/IdentitiesRepository'
import { EventData } from '../../../../types/EventData'
import { CreateIdentityPayload } from '../../../../types/messages/payloads/CreateIdentityPayload'
import { APIHandler } from '../../APIHandler'
import { DashPlatformProtocolWASM, IdentityPublicKeyWASM } from 'pshenmic-dpp'
import { WalletRepository } from '../../../repository/WalletRepository'
import { WalletType } from '../../../../types/WalletType'
import { base64 } from '@scure/base'
import { KeypairRepository } from '../../../repository/KeypairRepository'
import { validateHex } from '../../../../utils'
import { VoidResponse } from '../../../../types/messages/response/VoidResponse'
import { DashPlatformSDK } from 'dash-platform-sdk'

export class CreateIdentityHandler implements APIHandler {
  keypairRepository: KeypairRepository
  identitiesRepository: IdentitiesRepository
  walletRepository: WalletRepository
  dpp: DashPlatformProtocolWASM
  sdk: DashPlatformSDK

  constructor (identitiesRepository: IdentitiesRepository, keypairRepository: KeypairRepository, dpp: DashPlatformProtocolWASM, sdk: DashPlatformSDK) {
    this.identitiesRepository = identitiesRepository
    this.keypairRepository = keypairRepository
    this.dpp = dpp
    this.sdk = sdk
  }

  async handle (event: EventData): Promise<VoidResponse> {
    const payload: CreateIdentityPayload = event.payload
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }

    const identity = await this.identitiesRepository.getByIdentifier(payload.identifier)

    if (identity != null) {
      throw new Error(`Identity with identifier ${payload.identifier} already exists`)
    }

    const identityPublicKeysWASM = await this.sdk.identities.getIdentityPublicKeys(payload.identifier)

    if (wallet.type === WalletType.keystore) {
      if (!payload.privateKeys) {
        throw new Error('Private keys must be provided when wallet type is keystore')
      }

      // check if all private keys belongs to identity public keys
      if (!payload.privateKeys
        .every(privateKey => identityPublicKeysWASM
          .some((identityPublicKey: IdentityPublicKeyWASM) => identityPublicKey.getPublicKeyHash() ===
                        this.dpp.PrivateKeyWASM.fromHex(privateKey, wallet.network).getPublicKeyHash()))) {
        throw new Error('Private key does not belong to any of identity\'s public keys')
      }

      for (const privateKey of payload.privateKeys) {
        const [identityPublicKey] = identityPublicKeysWASM
          .filter((identityPublicKey: IdentityPublicKeyWASM) => identityPublicKey.getPublicKeyHash() ===
                        this.dpp.PrivateKeyWASM.fromHex(privateKey, wallet.network).getPublicKeyHash())

        await this.keypairRepository.add(payload.identifier, privateKey, identityPublicKey)
      }
    }

    await this.identitiesRepository.create(payload.identifier)

    return {}
  }

  validatePayload (payload: CreateIdentityPayload): string | null {
    try {
      new this.dpp.IdentifierWASM(payload.identifier)
    } catch (e) {
      return 'Could not decode identity identifier'
    }

    if (!payload?.privateKeys?.length) {
      return 'Private keys are missing'
    }

    if (!payload.privateKeys.every(privateKey => typeof privateKey === 'string' && validateHex(privateKey))) {
      return 'Private keys should be in hex format'
    }

    return null
  }
}
