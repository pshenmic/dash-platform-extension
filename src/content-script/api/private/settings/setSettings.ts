import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { WalletSettingsRepository } from '../../../repository/WalletSettingsRepository'
import { SetSettingsPayload } from '../../../../types/messages/payloads/SetSettingsPayload'
import { VoidResponse } from '../../../../types/messages/response/VoidResponse'

export class SetSettingsHandler implements APIHandler {
  walletSettingsRepository: WalletSettingsRepository

  constructor (walletSettingsRepository: WalletSettingsRepository) {
    this.walletSettingsRepository = walletSettingsRepository
  }

  async handle (event: EventData): Promise<VoidResponse> {
    const payload: SetSettingsPayload = event.payload

    await this.walletSettingsRepository.set({ hideBalance: payload.hideBalance })

    return {}
  }

  validatePayload (payload: SetSettingsPayload): string | null {
    if (typeof payload.hideBalance !== 'boolean') {
      return 'hideBalance must be a boolean'
    }

    return null
  }
}
