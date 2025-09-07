import { IdentitiesRepository } from '../../../repository/IdentitiesRepository'
import { APIHandler } from '../../APIHandler'
import { IdentifierWASM } from 'pshenmic-dpp'
import { WalletRepository } from '../../../repository/WalletRepository'
import { KeypairRepository } from '../../../repository/KeypairRepository'
import { VoidResponse } from '../../../../types/messages/response/VoidResponse'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { RemoveIdentityPrivateKeyPayload } from '../../../../types/messages/payloads/RemoveIdentityPrivateKeyPayload'
import { EventData } from '../../../../types/EventData'

export class RemoveIdentityPrivateKeyHandler implements APIHandler {
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
    const payload: RemoveIdentityPrivateKeyPayload = event.payload

    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }

    if (wallet.type !== 'keystore') {
      throw new Error('Removing private key only possible in keystore wallet mode')
    }

    const keyPairs = await this.keypairRepository.getAllByIdentity(payload.identity)

    if (!keyPairs.some((keyPair) => keyPair.identityPublicKey.keyId === payload.keyId)) {
      throw new Error(`Could not find key pair with keyId ${payload.keyId}`)
    }

    await this.keypairRepository.remove(payload.identity, payload.keyId)

    return {}
  }

  validatePayload (payload: RemoveIdentityPrivateKeyPayload): string | null {
    try {
      // eslint-disable-next-line no-new
      new IdentifierWASM(payload.identity)
    } catch (e) {
      return 'Could not decode identity identifier'
    }

    if (payload.keyId == null) {
      return 'Key ID is missing'
    }

    return null
  }
}
