import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { deriveShieldedAddresses } from '../../../../utils'
import { GenerateShieldedAddressesPayload } from '../../../../types/messages/payloads/GenerateShieldedAddressesPayload'
import { GetShieldedAddressesResponse } from '../../../../types/messages/response/GetShieldedAddressesResponse'

// Generates the next diversified Orchard (shielded) addresses and returns them.
// The wallet stores how many were created, so the next diversifier index is the
// current count. Unlike platform addresses, shielded ones cannot be derived
// publicly — the password is always required to unlock the seed.
export class GenerateShieldedAddressesHandler implements APIHandler {
  walletRepository: WalletRepository
  sdk: DashPlatformSDK

  constructor (walletRepository: WalletRepository, sdk: DashPlatformSDK) {
    this.walletRepository = walletRepository
    this.sdk = sdk
  }

  async handle (event: EventData): Promise<GetShieldedAddressesResponse> {
    const payload: GenerateShieldedAddressesPayload = event.payload
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }

    if (wallet.type !== 'seedphrase') {
      throw new Error('Shielded addresses can only be generated for a seedphrase wallet')
    }

    const account = 0
    const count = payload.count ?? 1
    const start = await this.walletRepository.getShieldedAddressCount(account)
    const addresses = deriveShieldedAddresses(wallet, payload.password, account, count, this.sdk, start)

    await this.walletRepository.setShieldedAddressCount(account, start + count)

    return { addresses }
  }

  validatePayload (payload: GenerateShieldedAddressesPayload): string | null {
    if (typeof payload.password !== 'string' || payload.password.length === 0) {
      return 'Password must be provided'
    }
    if ('account' in payload) {
      return 'Account is not supported'
    }
    if (payload.count != null && (!Number.isInteger(payload.count) || payload.count < 1)) {
      return 'Count must be a positive integer'
    }

    return null
  }
}
