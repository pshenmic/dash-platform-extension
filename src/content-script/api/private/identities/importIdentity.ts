import { IdentitiesRepository } from '../../../repository/IdentitiesRepository'
import { EventData } from '../../../../types'
import { APIHandler } from '../../APIHandler'
import { IdentityPublicKeyWASM, PrivateKeyWASM } from 'dash-platform-sdk/src/types'
import { WalletRepository } from '../../../repository/WalletRepository'
import { KeypairRepository } from '../../../repository/KeypairRepository'
import { validateHex } from '../../../../utils'
import { VoidResponse } from '../../../../types/messages/response/VoidResponse'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { ImportIdentityPayload } from '../../../../types/messages/payloads/ImportIdentityPayload'
import { IdentityType } from '../../../../types/enums/IdentityType'

export class ImportIdentityHandler implements APIHandler {
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
    const payload: ImportIdentityPayload = event.payload
    const privateKeys = payload?.privateKeys ?? []
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }

    if (wallet.type !== 'keystore') {
      throw new Error('Importing identity only possible in keystore wallet mode')
    }

    const identity = await this.identitiesRepository.getByIdentifier(payload.identity)

    if (identity != null) {
      throw new Error(`Identity with identifier ${payload.identity} already exists`)
    }

    const identityPublicKeysWASM = await this.sdk.identities.getIdentityPublicKeys(payload.identity)

    // check if all private keys belongs to identity public keys
    if (!privateKeys
      .every(privateKey => identityPublicKeysWASM
        .some((identityPublicKey: IdentityPublicKeyWASM) => identityPublicKey.getPublicKeyHash() ===
                PrivateKeyWASM.fromHex(privateKey, wallet.network).getPublicKeyHash()))) {
      throw new Error('One or more private keys does not match to any of known identity\'s public keys')
    }

    for (const privateKey of privateKeys) {
      const [identityPublicKey] = identityPublicKeysWASM
        .filter((identityPublicKey: IdentityPublicKeyWASM) => identityPublicKey.getPublicKeyHash() ===
              PrivateKeyWASM.fromHex(privateKey, wallet.network).getPublicKeyHash())

      await this.keypairRepository.add(payload.identity, privateKey, identityPublicKey.keyId)
    }

    await this.identitiesRepository.create(payload.identity, IdentityType.regular)

    return {}
  }

  validatePayload (payload: ImportIdentityPayload): string | null {
    if (!this.sdk.utils.validateIdentifier(payload.identity)) {
      return 'Could not decode identity identifier'
    }

    if (payload.privateKeys == null || payload.privateKeys.length === 0) {
      return 'Private keys are missing'
    }

    if (!payload.privateKeys.every(privateKey => typeof privateKey === 'string' && validateHex(privateKey))) {
      return 'Private keys should be in hex format'
    }

    return null
  }
}
