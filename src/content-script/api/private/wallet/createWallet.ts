import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { CreateWalletPayload } from '../../../../types/messages/payloads/CreateWalletPayload'
import { WalletRepository } from '../../../repository/WalletRepository'
import { WalletType } from '../../../../types/WalletType'
import { CreateWalletResponse } from '../../../../types/messages/response/CreateWalletResponse'
import { DashPlatformSDK } from 'dash-platform-sdk'

export class CreateWalletHandler implements APIHandler {
  walletRepository: WalletRepository
  sdk: DashPlatformSDK

  constructor (walletRepository: WalletRepository, sdk: DashPlatformSDK) {
    this.sdk = sdk
    this.walletRepository = walletRepository
  }

  async handle (event: EventData): Promise<CreateWalletResponse> {
    const payload: CreateWalletPayload = event.payload

    switch (payload.walletType) {
      case WalletType.seedphrase:
        return await this.createSeedphraseWallet(payload)
      case WalletType.keystore:
        return await this.createKeyStoreWallet(payload)
    }

    throw new Error('Unsupported wallet type')
  }

  async createKeyStoreWallet (payload: CreateWalletPayload): Promise<CreateWalletResponse> {
    const wallet = await this.walletRepository.create(WalletType.keystore)

    return { walletId: wallet.walletId }
  }

  async createSeedphraseWallet (payload: CreateWalletPayload): Promise<CreateWalletResponse> {
    const { mnemonic } = payload

    const wallet = await this.walletRepository.create(WalletType.seedphrase, mnemonic)

    return { walletId: wallet.walletId }
  }

  validatePayload (payload: CreateWalletPayload): string | null {
    const walletType = WalletType[payload.walletType]

    if (walletType == null) {
      return `Invalid wallet type: ${payload.walletType}`
    }

    if (walletType == WalletType.seedphrase && (!payload.mnemonic)) {
      return 'Mnemonic is missing'
    }

    return null
  }
}
