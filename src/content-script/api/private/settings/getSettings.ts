import { APIHandler } from '../../APIHandler'
import { WalletSettingsRepository } from '../../../repository/WalletSettingsRepository'
import { GetSettingsResponse } from '../../../../types/messages/response/GetSettingsResponse'
import { EmptyPayload } from '../../../../types/messages/payloads/EmptyPayload'

export class GetSettingsHandler implements APIHandler {
  walletSettingsRepository: WalletSettingsRepository

  constructor (walletSettingsRepository: WalletSettingsRepository) {
    this.walletSettingsRepository = walletSettingsRepository
  }

  async handle (): Promise<GetSettingsResponse> {
    const settings = await this.walletSettingsRepository.get()

    return { hideBalance: settings.hideBalance }
  }

  validatePayload (payload: EmptyPayload): string | null {
    return null
  }
}
