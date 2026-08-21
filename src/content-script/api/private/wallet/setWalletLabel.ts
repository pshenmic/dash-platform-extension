import { EventData } from '../../../../types/EventData'
import { validateWalletId } from '../../../../utils'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { SetWalletLabelPayload } from '../../../../types/messages/payloads/SetWalletLabelPayload'
import { VoidResponse } from '../../../../types/messages/response/VoidResponse'

export class SetWalletLabelHandler implements APIHandler {
  walletRepository: WalletRepository

  constructor (walletRepository: WalletRepository) {
    this.walletRepository = walletRepository
  }

  async handle (event: EventData): Promise<VoidResponse> {
    const payload: SetWalletLabelPayload = event.payload

    await this.walletRepository.setLabel(payload.walletId, payload.label)

    return {}
  }

  validatePayload (payload: SetWalletLabelPayload): string | null {
    if (!validateWalletId(payload.walletId)) {
      return `Invalid wallet id: ${payload.walletId}`
    }

    if (typeof payload.label !== 'string' || payload.label.trim() === '') {
      return 'Label must be a non-empty string'
    }

    return null
  }
}
