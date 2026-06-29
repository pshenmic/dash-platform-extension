import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { derivePlatformAddressesFromXpub } from '../../../../utils'
import { PLATFORM_ADDRESS_DEFAULT_COUNT } from '../../../../constants'
import { GetPlatformAddressesPayload } from '../../../../types/messages/payloads/GetPlatformAddressesPayload'
import { GetPlatformAddressesResponse } from '../../../../types/messages/response/GetPlatformAddressesResponse'

// Returns the current wallet's transparent (DIP-17) platform payment addresses
// for the first account. Derives them publicly from the cached platform xpub, so no
// password is needed. The xpub must have been cached once via
// CACHE_PLATFORM_XPUB; otherwise this fails and the UI should prompt for
// the password and call that first.
export class GetPlatformAddressesHandler implements APIHandler {
  walletRepository: WalletRepository

  constructor (walletRepository: WalletRepository) {
    this.walletRepository = walletRepository
  }

  async handle (event: EventData): Promise<GetPlatformAddressesResponse> {
    const payload: GetPlatformAddressesPayload = event.payload
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }

    const account = 0
    const count = payload.count ?? PLATFORM_ADDRESS_DEFAULT_COUNT

    const xpub = await this.walletRepository.getPlatformAccountXpub(account)

    if (xpub == null) {
      throw new Error('Platform xpub is not initialized. Call cachePlatformXpub with the wallet password first')
    }

    const addresses = derivePlatformAddressesFromXpub(xpub, wallet.network, account, count)

    return { addresses }
  }

  validatePayload (payload: GetPlatformAddressesPayload): string | null {
    if ('account' in payload) {
      return 'Account is not supported'
    }
    if (payload.count != null && (!Number.isInteger(payload.count) || payload.count <= 0)) {
      return 'Count must be a positive integer'
    }

    return null
  }
}
