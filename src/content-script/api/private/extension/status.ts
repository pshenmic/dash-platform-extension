import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { GetStatusResponse } from '../../../../types/messages/response/GetStatusResponse'
import { StorageAdapter } from '../../../storage/storageAdapter'
import { EmptyPayload } from '../../../../types/messages/payloads/EmptyPayload'

export class GetStatusHandler implements APIHandler {
  storageAdapter: StorageAdapter

  constructor (storageAdapter: StorageAdapter) {
    this.storageAdapter = storageAdapter
  }

  async handle (): Promise<GetStatusResponse> {
    const network = await this.storageAdapter.get('network') as string
    const currentWalletId = (await this.storageAdapter.get('currentWalletId')) as (string | null)
    const currentIdentity = (await this.storageAdapter.get('currentIdentity')) as (string | null)
    const passwordPublicKey = (await this.storageAdapter.get('passwordPublicKey')) as (string | null)

    return { passwordSet: !!passwordPublicKey, network, currentWalletId, currentIdentity }
  }

  validatePayload (payload: EmptyPayload): string | null {
    return null
  }
}
