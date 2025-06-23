import { APIHandler } from '../../APIHandler'
import { EventData } from '../../../../types/EventData'
import { ApproveAppConnectPayload } from '../../../../types/messages/payloads/ApproveAppConnectPayload'
import { VoidResponse } from '../../../../types/messages/response/VoidResponse'
import { AppConnectRepository } from '../../../repository/AppConnectRepository'
import { StorageAdapter } from '../../../storage/storageAdapter'
import { AppConnectsStorageSchema } from '../../../storage/storageSchema'
import { AppConnectStatus } from '../../../../types/enums/AppConnectStatus'

export class ApproveAppConnectHandler implements APIHandler {
  appConnectRepository: AppConnectRepository
  storageAdapter: StorageAdapter

  constructor(appConnectRepository: AppConnectRepository, storageAdapter: StorageAdapter) {
    this.appConnectRepository = appConnectRepository
    this.storageAdapter = storageAdapter
  }

  async handle(event: EventData): Promise<VoidResponse> {
    const payload: ApproveAppConnectPayload = event.payload
    
    const network = await this.storageAdapter.get('network') as string
    const walletId = await this.storageAdapter.get('currentWalletId') as string | null

    if (walletId == null) {
      throw new Error('Wallet is not chosen')
    }

    const storageKey = `appConnects_${network}_${walletId}`
    const appConnects = (await this.storageAdapter.get(storageKey) ?? {}) as AppConnectsStorageSchema

    if (appConnects[payload.id] == null) {
      throw new Error('AppConnect not found')
    }

    appConnects[payload.id].status = AppConnectStatus.approved

    await this.storageAdapter.set(storageKey, appConnects)

    return {}
  }

  validatePayload(payload: ApproveAppConnectPayload): null | string {
    if (typeof payload?.id !== 'string' || payload.id.length === 0) {
      return 'ID is required'
    }

    return null
  }
} 