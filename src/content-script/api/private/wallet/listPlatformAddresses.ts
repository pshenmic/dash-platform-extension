import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { derivePlatformAddressesFromXpub } from '../../../../utils'
import { EmptyPayload } from '../../../../types/messages/payloads/EmptyPayload'
import { GetPlatformAddressesResponse } from '../../../../types/messages/response/GetPlatformAddressesResponse'

// Returns all platform addresses created so far (indices 0..count-1), derived
// publicly from the cached platform xpub — no password. Returns an empty list
// until addresses are created via GENERATE_PLATFORM_ADDRESSES.
export class ListPlatformAddressesHandler implements APIHandler {
  walletRepository: WalletRepository
  sdk: DashPlatformSDK

  constructor (walletRepository: WalletRepository, sdk: DashPlatformSDK) {
    this.walletRepository = walletRepository
    this.sdk = sdk
  }

  async handle (): Promise<GetPlatformAddressesResponse> {
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }

    const account = 0
    const count = await this.walletRepository.getPlatformAddressCount(account)
    const xpub = await this.walletRepository.getPlatformAccountXpub(account)

    if (count === 0 || xpub == null) {
      return { addresses: [] }
    }

    const addresses = derivePlatformAddressesFromXpub(this.sdk, xpub, wallet.network, account, count)

    return { addresses }
  }

  validatePayload (payload: EmptyPayload): string | null {
    if ('account' in payload) {
      return 'Account is not supported'
    }

    return null
  }
}
