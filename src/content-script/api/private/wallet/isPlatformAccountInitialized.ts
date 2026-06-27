import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { IsPlatformAccountInitializedPayload } from '../../../../types/messages/payloads/IsPlatformAccountInitializedPayload'
import { IsPlatformAccountInitializedResponse } from '../../../../types/messages/response/IsPlatformAccountInitializedResponse'

// Reports whether the account xpub is cached, so the UI can decide up front
// (without a password and without relying on getPlatformAddresses error text)
// whether cachePlatformAccountXpub needs to be called first.
export class IsPlatformAccountInitializedHandler implements APIHandler {
  walletRepository: WalletRepository

  constructor (walletRepository: WalletRepository) {
    this.walletRepository = walletRepository
  }

  async handle (event: EventData): Promise<IsPlatformAccountInitializedResponse> {
    const payload: IsPlatformAccountInitializedPayload = event.payload
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }

    const account = payload.account ?? 0
    const xpub = await this.walletRepository.getPlatformAccountXpub(account)

    return { initialized: xpub != null }
  }

  validatePayload (payload: IsPlatformAccountInitializedPayload): string | null {
    if (payload.account != null && (!Number.isInteger(payload.account) || payload.account < 0)) {
      return 'Account must be a non-negative integer'
    }

    return null
  }
}
