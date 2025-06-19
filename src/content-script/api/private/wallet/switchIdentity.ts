import { EventData } from '../../../../types/EventData'
import { validateIdentifier } from '../../../../utils'
import { APIHandler } from '../../APIHandler'
import { SwitchIdentityPayload } from '../../../../types/messages/payloads/SwitchIdentityPayload'
import { IdentitiesRepository } from '../../../repository/IdentitiesRepository'
import { VoidResponse } from '../../../../types/messages/response/VoidResponse'
import { WalletRepository } from '../../../repository/WalletRepository'

export class SwitchIdentityHandler implements APIHandler {
  identitiesRepository: IdentitiesRepository
  walletRepository: WalletRepository

  constructor (identitiesRepository: IdentitiesRepository, walletRepository: WalletRepository) {
    this.identitiesRepository = identitiesRepository
    this.walletRepository = walletRepository
  }

  async handle (event: EventData): Promise<VoidResponse> {
    const payload: SwitchIdentityPayload = event.payload

    const wallet = await this.walletRepository.getCurrent()

    if (!wallet) {
      throw new Error('Wallet is not chosen')
    }

    await this.walletRepository.switchIdentity(payload.identity)

    return {}
  }

  validatePayload (payload: SwitchIdentityPayload): string | null {
    if (!validateIdentifier(payload.identity)) {
      return `Invalid identity identifier: ${payload.identity}`
    }

    return null
  }
}
