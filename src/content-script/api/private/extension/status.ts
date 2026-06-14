import { APIHandler } from '../../APIHandler'
import { GetStatusResponse } from '../../../../types/messages/response/GetStatusResponse'
import { StorageAdapter } from '../../../storage/storageAdapter'
import { WalletRepository } from '../../../repository/WalletRepository'
import { EmptyPayload } from '../../../../types/messages/payloads/EmptyPayload'
import { SCHEMA_VERSION } from '../../../../constants'

export class GetStatusHandler implements APIHandler {
  storageAdapter: StorageAdapter
  walletRepository: WalletRepository

  constructor (storageAdapter: StorageAdapter, walletRepository: WalletRepository) {
    this.storageAdapter = storageAdapter
    this.walletRepository = walletRepository
  }

  async handle (): Promise<GetStatusResponse> {
    const network = await this.storageAdapter.get('network') as string
    const currentWalletId = (await this.storageAdapter.get('currentWalletId')) as (string | null)
    const passwordPublicKey = (await this.storageAdapter.get('passwordPublicKey')) as (string | null)
    const schemaVersion = (await this.storageAdapter.get('schemaVersion')) as (number | null)
    const hasAnyWallet = await this.walletRepository.hasAnyWallet()

    const ready = schemaVersion !== SCHEMA_VERSION

    return { passwordSet: passwordPublicKey != null, network, currentWalletId, ready, hasAnyWallet }
  }

  validatePayload (payload: EmptyPayload): string | null {
    return null
  }
}
