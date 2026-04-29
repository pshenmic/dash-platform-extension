import { EventData } from '../../../../types'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { AssetLockFundingAddressesRepository } from '../../../repository/AssetLockFundingAddressesRepository'
import { RequestAssetLockFundingAddressResponse } from '../../../../types/messages/response/RequestAssetLockFundingAddressResponse'

export class RequestAssetLockFundingAddressHandler implements APIHandler {
  assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository
  walletRepository: WalletRepository

  constructor (
    assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository,
    walletRepository: WalletRepository
  ) {
    this.assetLockFundingAddressesRepository = assetLockFundingAddressesRepository
    this.walletRepository = walletRepository
  }

  async handle (_event: EventData): Promise<RequestAssetLockFundingAddressResponse> {
    const wallet = await this.walletRepository.getCurrent()
    if (wallet == null) throw new Error('Wallet is not chosen')

    const { address } = await this.assetLockFundingAddressesRepository.create()

    return { address }
  }

  validatePayload (_payload: unknown): null | string {
    return null
  }
}
