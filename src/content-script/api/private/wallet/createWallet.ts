import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { CreateWalletPayload } from '../../../../types/messages/payloads/CreateWalletPayload'
import { WalletRepository } from '../../../repository/WalletRepository'
import { WalletType } from '../../../../types/WalletType'
import { CreateWalletResponse } from '../../../../types/messages/response/CreateWalletResponse'
import { DashPlatformSDK } from 'dash-platform-sdk'
import {StorageAdapter} from "../../../storage/storageAdapter";

export class CreateWalletHandler implements APIHandler {
  walletRepository: WalletRepository
  sdk: DashPlatformSDK
  storageAdapter: StorageAdapter

  constructor (walletRepository: WalletRepository, sdk: DashPlatformSDK, storageAdapter: StorageAdapter) {
    this.sdk = sdk
    this.walletRepository = walletRepository
    this.storageAdapter = storageAdapter
  }

  async handle (event: EventData): Promise<CreateWalletResponse> {
    const payload: CreateWalletPayload = event.payload

    let response

    switch (payload.walletType) {
      case WalletType.seedphrase:
        (response) = await this.createSeedphraseWallet(payload)
        break;
      case WalletType.keystore:
        (response) = await this.createKeyStoreWallet(payload)
          break;
      default:
        throw new Error('Unsupported wallet type')
    }

    const wallets = await this.storageAdapter.get('wallets') as string[]

    await this.storageAdapter.set('wallets', [...wallets, response.walletId])

    return {walletId: response.walletId}
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
