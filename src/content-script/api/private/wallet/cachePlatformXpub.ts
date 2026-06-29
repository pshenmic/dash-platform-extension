import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { derivePlatformAccountXpub } from '../../../../utils'
import { CachePlatformXpubPayload } from '../../../../types/messages/payloads/CachePlatformXpubPayload'
import { VoidResponse } from '../../../../types/messages/response/VoidResponse'

// Derives the platform xpub from the encrypted seed (needs the
// password) and caches it on the wallet. Run once; afterwards
// GET_PLATFORM_ADDRESSES derives addresses publicly from this xpub without a
// password.
export class CachePlatformXpubHandler implements APIHandler {
  walletRepository: WalletRepository
  sdk: DashPlatformSDK

  constructor (walletRepository: WalletRepository, sdk: DashPlatformSDK) {
    this.walletRepository = walletRepository
    this.sdk = sdk
  }

  async handle (event: EventData): Promise<VoidResponse> {
    const payload: CachePlatformXpubPayload = event.payload
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }

    const account = 0

    const xpub = await derivePlatformAccountXpub(wallet, payload.password, account, this.sdk)
    await this.walletRepository.setPlatformAccountXpub(account, xpub)

    return {}
  }

  validatePayload (payload: CachePlatformXpubPayload): string | null {
    if (typeof payload.password !== 'string' || payload.password.length === 0) {
      return 'Password must be provided'
    }
    if ('account' in payload) {
      return 'Account is not supported'
    }

    return null
  }
}
