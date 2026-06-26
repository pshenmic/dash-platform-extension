import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { derivePlatformAddresses } from '../../../../utils'
import { PLATFORM_ADDRESS_DEFAULT_COUNT } from '../../../../constants'
import { GetPlatformAddressesPayload } from '../../../../types/messages/payloads/GetPlatformAddressesPayload'
import { GetPlatformAddressesResponse } from '../../../../types/messages/response/GetPlatformAddressesResponse'

// Derives the current wallet's transparent (DIP-17) platform payment addresses.
// Requires the password because the addresses come from the encrypted seed;
// balances are fetched separately via GET_PLATFORM_ADDRESSES_INFOS.
export class GetPlatformAddressesHandler implements APIHandler {
  walletRepository: WalletRepository
  sdk: DashPlatformSDK

  constructor (walletRepository: WalletRepository, sdk: DashPlatformSDK) {
    this.walletRepository = walletRepository
    this.sdk = sdk
  }

  async handle (event: EventData): Promise<GetPlatformAddressesResponse> {
    const payload: GetPlatformAddressesPayload = event.payload
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }

    const account = payload.account ?? 0
    const count = payload.count ?? PLATFORM_ADDRESS_DEFAULT_COUNT

    const addresses = await derivePlatformAddresses(wallet, payload.password, account, count, this.sdk)

    return { addresses }
  }

  validatePayload (payload: GetPlatformAddressesPayload): string | null {
    if (typeof payload.password !== 'string' || payload.password.length === 0) {
      return 'Password must be provided'
    }
    if (payload.account != null && (!Number.isInteger(payload.account) || payload.account < 0)) {
      return 'Account must be a non-negative integer'
    }
    if (payload.count != null && (!Number.isInteger(payload.count) || payload.count <= 0)) {
      return 'Count must be a positive integer'
    }

    return null
  }
}
