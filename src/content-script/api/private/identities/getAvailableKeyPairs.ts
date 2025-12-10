import { IdentitiesRepository } from '../../../repository/IdentitiesRepository'
import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { IdentifierWASM } from 'pshenmic-dpp'
import { WalletRepository } from '../../../repository/WalletRepository'
import { KeypairRepository } from '../../../repository/KeypairRepository'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { AddIdentityPrivateKeyPayload } from '../../../../types/messages/payloads/AddIdentityPrivateKeyPayload'
import { GetAvailableKeyPairsResponse } from '../../../../types/messages/response/GetAvailableKeyPairsResponse'
import { GetAvailableKeyPairsPayload } from '../../../../types/messages/payloads/GetAvailableKeyPairsPayload'

export class GetAvailableKeyPairs implements APIHandler {
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

  async handle (event: EventData): Promise<GetAvailableKeyPairsResponse> {
    const payload: AddIdentityPrivateKeyPayload = event.payload
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }

    // check identity exists
    const identity = await this.identitiesRepository.getByIdentifier(payload.identity)

    if (identity == null) {
      throw new Error(`Identity with identifier ${payload.identity} not found`)
    }

    if (wallet.type === 'seedphrase') {
      const identityWASM = (await this.sdk.identities.getIdentityByIdentifier(payload.identity))
      const keyIds = identityWASM
        .getPublicKeys()
        .map(identityPublicKey => identityPublicKey.keyId)

      return { keyIds }
    } else if (wallet.type === 'keystore') {
      const keyPairs = await this.keypairRepository.getAllByIdentity(payload.identity)

      return {
        keyIds: keyPairs
          .filter(keyPair => !keyPair.pending)
          .map(keyPair => keyPair.keyId)
      }
    } else {
      throw new Error('Unknown wallet type')
    }
  }

  validatePayload (payload: GetAvailableKeyPairsPayload): string | null {
    try {
      // eslint-disable-next-line no-new
      new IdentifierWASM(payload.identity)
    } catch (e) {
      return 'Could not decode identity identifier'
    }
    return null
  }
}
