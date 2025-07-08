import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import {  } from 'pshenmic-dpp'
import { CreateWalletPayload } from '../../../../types/messages/payloads/CreateWalletPayload'
import { WalletRepository } from '../../../repository/WalletRepository'
import { WalletType } from '../../../../types/WalletType'
import { CreateWalletResponse } from '../../../../types/messages/response/CreateWalletResponse'

export class CreateWalletHandler implements APIHandler {
  walletRepository: WalletRepository

  constructor (walletRepository: WalletRepository) {
    this.walletRepository = walletRepository
  }

  async handle (event: EventData): Promise<CreateWalletResponse> {
    const payload: CreateWalletPayload = event.payload

    const walletType = WalletType[payload.walletType]

    const wallet = await this.walletRepository.create(walletType)

    return { walletId: wallet.walletId }
  }

  validatePayload (payload: CreateWalletPayload): string | null {
    if (WalletType[payload.walletType] == null) {
      return `Invalid wallet type: ${payload.walletType}`
    }

    // todo validate password

    return null
  }
}
