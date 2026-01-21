import { IdentitiesRepository } from '../../../repository/IdentitiesRepository'
import { EventData, WalletType } from '../../../../types'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { KeypairRepository } from '../../../repository/KeypairRepository'
import { deriveKeystorePrivateKey, deriveSeedphrasePrivateKey } from '../../../../utils'
import { VoidResponse } from '../../../../types/messages/response/VoidResponse'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { ExportPrivateKeyPayload } from '../../../../types/messages/payloads/ExportPrivateKeyPayload'

export class ExportPrivateKeyHandler implements APIHandler {
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
    const payload: ExportPrivateKeyPayload = event.payload
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }

    // check identity exists
    const identity = await this.identitiesRepository.getByIdentifier(payload.identity)

    if (identity == null) {
      throw new Error(`Identity with identifier ${payload.identity} not found`)
    }

    // export private
    let privateKeyWASM

    if (wallet.type === WalletType.keystore) {
      privateKeyWASM = await deriveKeystorePrivateKey(wallet, payload.password, payload.identity, payload.keyId, this.keypairRepository)
    } else if (wallet.type === WalletType.seedphrase) {
      privateKeyWASM = await deriveSeedphrasePrivateKey(wallet, payload.password, identity.index, payload.keyId, this.sdk)
    } else {
      throw new Error('Unsupported wallet type')
    }

    return { wif: privateKeyWASM.WIF(), hex: privateKeyWASM.hex().toLowerCase() }
  }

  validatePayload (payload: ExportPrivateKeyPayload): string | null {
    if (!this.sdk.utils.validateIdentifier(payload.identity)) {
      return 'Could not decode identity identifier'
    }

    if (payload.keyId == null) {
      return 'Identity index is missing'
    }

    if (payload.password == null) {
      return 'Password is missing'
    }

    return null
  }
}
