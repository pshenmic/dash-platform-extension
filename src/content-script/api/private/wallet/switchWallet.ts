import { EventData } from '../../../../types/EventData'
import { validateWalletId } from '../../../../utils'
import { APIHandler } from '../../APIHandler'
import { DashPlatformProtocolWASM } from 'pshenmic-dpp'
import { WalletRepository } from '../../../repository/WalletRepository'
import { SwitchWalletPayload } from '../../../../types/messages/payloads/SwitchWalletPayload'
import { Network } from '../../../../types/enums/Network'
import { VoidResponse } from '../../../../types/messages/response/VoidResponse'

export class SwitchWalletHandler implements APIHandler {
  walletRepository: WalletRepository
  dpp: DashPlatformProtocolWASM

  constructor (walletRepository: WalletRepository, dpp: DashPlatformProtocolWASM) {
    this.walletRepository = walletRepository
    this.dpp = dpp
  }

  async handle (event: EventData): Promise<VoidResponse> {
    const payload: SwitchWalletPayload = event.payload

    await this.walletRepository.switchWallet(Network[payload.network], payload.walletId)

    return {}
  }

  validatePayload (payload: SwitchWalletPayload): string | null {
    if (!Network[payload.network]) {
      return `Unknown network: ${payload.network}`
    }

    if (!validateWalletId(payload.walletId)) {
      return `Invalid wallet id: ${payload.walletId}`
    }

    return null
  }
}
