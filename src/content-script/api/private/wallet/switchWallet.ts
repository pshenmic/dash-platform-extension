import { EventData } from '../../../../types/EventData'
import { validateWalletId } from '../../../../utils'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { SwitchWalletPayload } from '../../../../types/messages/payloads/SwitchWalletPayload'
import { VoidResponse } from '../../../../types/messages/response/VoidResponse'
import { StorageAdapter } from '../../../storage/storageAdapter'

export class SwitchWalletHandler implements APIHandler {
  walletRepository: WalletRepository
  storageAdapter: StorageAdapter

  constructor (walletRepository: WalletRepository, storageAdapter: StorageAdapter) {
    this.walletRepository = walletRepository
    this.storageAdapter = storageAdapter
  }

  async handle (event: EventData): Promise<VoidResponse> {
    const payload: SwitchWalletPayload = event.payload

    const wallet = await this.walletRepository.getById(payload.walletId)

    if (wallet == null) {
      throw new Error(`Could not find wallet ${payload.walletId}`)
    }

    await this.storageAdapter.set('currentWalletId', payload.walletId)

    return {}
  }

  validatePayload (payload: SwitchWalletPayload): string | null {
    if (!validateWalletId(payload.walletId)) {
      return `Invalid wallet id: ${payload.walletId}`
    }

    return null
  }
}
