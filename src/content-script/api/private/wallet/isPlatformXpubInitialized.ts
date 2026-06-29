import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { IsPlatformXpubInitializedPayload } from '../../../../types/messages/payloads/IsPlatformXpubInitializedPayload'
import { IsPlatformXpubInitializedResponse } from '../../../../types/messages/response/IsPlatformXpubInitializedResponse'

// Reports whether the platform xpub is cached, so the UI can decide up front
// (without a password and without relying on getPlatformAddresses error text)
// whether cachePlatformXpub needs to be called first.
export class IsPlatformXpubInitializedHandler implements APIHandler {
  walletRepository: WalletRepository

  constructor (walletRepository: WalletRepository) {
    this.walletRepository = walletRepository
  }

  async handle (): Promise<IsPlatformXpubInitializedResponse> {
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }

    const account = 0
    const xpub = await this.walletRepository.getPlatformAccountXpub(account)

    return { initialized: xpub != null }
  }

  validatePayload (payload: IsPlatformXpubInitializedPayload): string | null {
    if ('account' in payload) {
      return 'Account is not supported'
    }

    return null
  }
}
