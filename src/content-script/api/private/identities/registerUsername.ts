import { IdentitiesRepository } from '../../../repository/IdentitiesRepository'
import { EventData, WalletType } from '../../../../types'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { KeypairRepository } from '../../../repository/KeypairRepository'
import { deriveKeystorePrivateKey, deriveSeedphrasePrivateKey } from '../../../../utils'
import { VoidResponse } from '../../../../types/messages/response/VoidResponse'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { RegisterUsernamePayload } from '../../../../types/messages/payloads/RegisterUsernamePayload'

export class RegisterUsernameHandler implements APIHandler {
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
    const payload: RegisterUsernamePayload = event.payload
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }

    const identity = await this.identitiesRepository.getByIdentifier(payload.identity)

    if (identity == null) {
      throw new Error(`Identity with identifier ${payload.identity} not found`)
    }

    let privateKeyWASM

    if (wallet.type === WalletType.keystore) {
      privateKeyWASM = await deriveKeystorePrivateKey(wallet, payload.password, payload.identity, payload.keyId, this.keypairRepository)
    } else if (wallet.type === WalletType.seedphrase) {
      privateKeyWASM = await deriveSeedphrasePrivateKey(wallet, payload.password, identity.index, payload.keyId, this.sdk)
    } else {
      throw new Error('Unsupported wallet type')
    }

    await this.sdk.names.registerName(payload.username, payload.identity, privateKeyWASM)

    return {}
  }

  validatePayload (payload: RegisterUsernamePayload): string | null {
    if (!this.sdk.utils.validateIdentifier(payload.identity)) {
      return 'Could not decode identity identifier'
    }

    if (payload.password == null) {
      return 'Private keys are missing'
    }

    if (payload.username == null) {
      return 'Username is missing'
    }

    if (this.sdk.names.validateName(payload.username) != null) {
      return 'Invalid username'
    }

    return null
  }
}
