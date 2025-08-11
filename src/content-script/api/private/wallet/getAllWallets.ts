import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { WalletType } from '../../../../types/WalletType'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { StorageAdapter } from '../../../storage/storageAdapter'
import { GetAllWalletsResponse } from '../../../../types/messages/response/GetAllWalletsResponse'
import { Network } from '../../../../types/enums/Network'
import { EmptyPayload } from '../../../../types/messages/payloads/EmptyPayload'

export class GetAllWalletsHandler implements APIHandler {
  walletRepository: WalletRepository
  sdk: DashPlatformSDK
  storageAdapter: StorageAdapter

  constructor (walletRepository: WalletRepository, sdk: DashPlatformSDK, storageAdapter: StorageAdapter) {
    this.sdk = sdk
    this.walletRepository = walletRepository
    this.storageAdapter = storageAdapter
  }

  async handle (): Promise<GetAllWalletsResponse> {
    const wallets = await this.walletRepository.getAll()

    return {
      wallets: wallets.map((wallet) => ({
        walletId: wallet.walletId,
        type: WalletType[wallet.type],
        network: Network[wallet.network],
        label: wallet.label
      }))
    }
  }

  validatePayload (payload: EmptyPayload): string | null {
    return null
  }
}
