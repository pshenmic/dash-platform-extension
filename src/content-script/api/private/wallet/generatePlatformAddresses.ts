import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { derivePlatformAccountXpub, derivePlatformAddressesFromXpub } from '../../../../utils'
import { GeneratePlatformAddressesPayload } from '../../../../types/messages/payloads/GeneratePlatformAddressesPayload'
import { GetPlatformAddressesResponse } from '../../../../types/messages/response/GetPlatformAddressesResponse'

// Generates the next platform (DIP-17) address and returns it. Derives publicly
// from the cached platform xpub — normally cached at wallet creation. If the xpub
// is missing (e.g. a legacy wallet), a password must be supplied to initialize it.
export class GeneratePlatformAddressesHandler implements APIHandler {
  walletRepository: WalletRepository
  sdk: DashPlatformSDK

  constructor (walletRepository: WalletRepository, sdk: DashPlatformSDK) {
    this.walletRepository = walletRepository
    this.sdk = sdk
  }

  async handle (event: EventData): Promise<GetPlatformAddressesResponse> {
    const payload: GeneratePlatformAddressesPayload = event.payload
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }

    if (wallet.type !== 'seedphrase') {
      throw new Error('Platform addresses can only be generated for a seedphrase wallet')
    }

    const account = 0
    let xpub = await this.walletRepository.getPlatformAccountXpub(account)

    if (xpub == null) {
      if (payload.password == null || payload.password.length === 0) {
        throw new Error('Platform xpub is not initialized. Provide the wallet password to initialize it')
      }

      xpub = await derivePlatformAccountXpub(wallet, payload.password, account, this.sdk)
      await this.walletRepository.setPlatformAccountXpub(account, xpub)
    }

    const start = await this.walletRepository.getPlatformAddressCount(account)
    const addresses = derivePlatformAddressesFromXpub(xpub, wallet.network, account, 1, start)

    await this.walletRepository.setPlatformAddressCount(account, start + 1)

    return { addresses }
  }

  validatePayload (payload: GeneratePlatformAddressesPayload): string | null {
    if (payload.password != null && (typeof payload.password !== 'string' || payload.password.length === 0)) {
      return 'Password must be a non-empty string when provided'
    }
    if ('account' in payload) {
      return 'Account is not supported'
    }
    if ('count' in payload) {
      return 'Count is not supported'
    }

    return null
  }
}
