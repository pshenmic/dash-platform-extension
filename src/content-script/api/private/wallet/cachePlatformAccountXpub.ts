import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { derivePlatformAccountXpub } from '../../../../utils'
import { CachePlatformAccountXpubPayload } from '../../../../types/messages/payloads/CachePlatformAccountXpubPayload'
import { VoidResponse } from '../../../../types/messages/response/VoidResponse'

// Derives the DIP-17 account-level xpub from the encrypted seed (needs the
// password) and caches it on the wallet. Run once per account; afterwards
// GET_PLATFORM_ADDRESSES derives addresses publicly from this xpub without a
// password.
export class CachePlatformAccountXpubHandler implements APIHandler {
  walletRepository: WalletRepository
  sdk: DashPlatformSDK

  constructor (walletRepository: WalletRepository, sdk: DashPlatformSDK) {
    this.walletRepository = walletRepository
    this.sdk = sdk
  }

  async handle (event: EventData): Promise<VoidResponse> {
    const payload: CachePlatformAccountXpubPayload = event.payload
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }

    const account = payload.account ?? 0

    const xpub = await derivePlatformAccountXpub(wallet, payload.password, account, this.sdk)
    await this.walletRepository.setPlatformAccountXpub(account, xpub)

    return {}
  }

  validatePayload (payload: CachePlatformAccountXpubPayload): string | null {
    if (typeof payload.password !== 'string' || payload.password.length === 0) {
      return 'Password must be provided'
    }
    if (payload.account != null && (!Number.isInteger(payload.account) || payload.account < 0)) {
      return 'Account must be a non-negative integer'
    }

    return null
  }
}
