import { IdentitiesRepository } from '../../../repository/IdentitiesRepository'
import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { IdentityPublicKeyWASM, PrivateKeyWASM, IdentifierWASM } from 'pshenmic-dpp'
import { WalletRepository } from '../../../repository/WalletRepository'
import { KeypairRepository } from '../../../repository/KeypairRepository'
import { validateHex } from '../../../../utils'
import { VoidResponse } from '../../../../types/messages/response/VoidResponse'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { ImportIdentityPayload } from '../../../../types/messages/payloads/ImportIdentityPayload'

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

    const identity = await this.identitiesRepository.getByIdentifier(payload.identifier)

    if (identity != null) {
      throw new Error(`Identity with identifier ${payload.identifier} already exists`)
    }

    const identityPublicKeysWASM = await this.sdk.identities.getIdentityPublicKeys(payload.identifier)

    // check if all private keys belongs to identity public keys
    if ((privateKeys)
      .every(privateKey => identityPublicKeysWASM
        .some((identityPublicKey: IdentityPublicKeyWASM) => identityPublicKey.getPublicKeyHash() ===
                PrivateKeyWASM.fromHex(privateKey, wallet.network).getPublicKeyHash()))) {
      throw new Error('Private key does not belong to any of identity\'s public keys')
    }

    for (const privateKey of privateKeys) {
      const [identityPublicKey] = identityPublicKeysWASM
        .filter((identityPublicKey: IdentityPublicKeyWASM) => identityPublicKey.getPublicKeyHash() ===
              PrivateKeyWASM.fromHex(privateKey, wallet.network).getPublicKeyHash())

      await this.keypairRepository.add(payload.identifier, privateKey, identityPublicKey)
    }

    await this.identitiesRepository.create(payload.identifier)

    return {}
  }

  validatePayload (payload: ImportIdentityPayload): string | null {
    try {
      // eslint-disable-next-line no-new
      new IdentifierWASM(payload.identifier)
    } catch (e) {
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
