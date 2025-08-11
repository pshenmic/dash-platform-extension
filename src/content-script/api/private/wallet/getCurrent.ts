import { IdentitiesRepository } from '../../../repository/IdentitiesRepository'
import { GetCurrentIdentityResponse } from '../../../../types/messages/response/GetCurrentIdentityResponse'
import { APIHandler } from '../../APIHandler'
import { EmptyPayload } from '../../../../types/messages/payloads/EmptyPayload'
import {WalletRepository} from "../../../repository/WalletRepository";

export class GetCurrentIdentityHandler implements APIHandler {
  walletRepository: WalletRepository

  constructor (walletRepository: WalletRepository) {
    this.walletRepository = walletRepository
  }

  async handle (): Promise<GetCurrentIdentityResponse> {
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      return { currentIdentity: null }
    }

    return { currentIdentity: wallet.currentIdentity }
  }

  validatePayload (payload: EmptyPayload): null | string {
    return null
  }
}
