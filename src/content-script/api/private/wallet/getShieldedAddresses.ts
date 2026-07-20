import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { deriveShieldedAddresses } from '../../../../utils'
import { SHIELDED_ADDRESS_DEFAULT_COUNT } from '../../../../constants'
import { GetShieldedAddressesPayload } from '../../../../types/messages/payloads/GetShieldedAddressesPayload'
import { GetShieldedAddressesResponse } from '../../../../types/messages/response/GetShieldedAddressesResponse'

// Derives the current wallet's diversified Orchard (shielded) addresses for an
// account. Requires the password because the addresses come from the encrypted
// seed; shielded balance is fetched separately via GET_SHIELDED_BALANCE.
export class GetShieldedAddressesHandler implements APIHandler {
  walletRepository: WalletRepository
  sdk: DashPlatformSDK

  constructor (walletRepository: WalletRepository, sdk: DashPlatformSDK) {
    this.walletRepository = walletRepository
    this.sdk = sdk
  }

  async handle (event: EventData): Promise<GetShieldedAddressesResponse> {
    const payload: GetShieldedAddressesPayload = event.payload
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }

    const account = payload.account ?? 0
    const count = payload.count ?? SHIELDED_ADDRESS_DEFAULT_COUNT

    const addresses = deriveShieldedAddresses(wallet, payload.password, account, count, this.sdk)

    return { addresses }
  }

  validatePayload (payload: GetShieldedAddressesPayload): string | null {
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
