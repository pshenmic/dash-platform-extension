import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { DashPlatformProtocolWASM } from 'pshenmic-dpp'
import { CreateWalletPayload } from '../../../../types/messages/payloads/CreateWalletPayload'
import { WalletRepository } from '../../../repository/WalletRepository'
import { WalletType } from '../../../../types/WalletType'
import { VoidResponse } from '../../../../types/messages/response/VoidResponse'

export class CreateWalletHandler implements APIHandler {
  walletRepository: WalletRepository
  dpp: DashPlatformProtocolWASM

  constructor (walletRepository: WalletRepository, dpp: DashPlatformProtocolWASM) {
    this.walletRepository = walletRepository
    this.dpp = dpp
  }

  async handle (event: EventData): Promise<VoidResponse> {
    const payload: CreateWalletPayload = event.payload

    const walletType = WalletType[payload.walletType]

    await this.walletRepository.create(walletType)

    return {}
  }

  validatePayload (payload: CreateWalletPayload): string | null {
    if (!WalletType[payload.walletType]) {
      return `Invalid wallet type: ${payload.walletType}`
    }

    // todo validate password

    return null
  }
}
