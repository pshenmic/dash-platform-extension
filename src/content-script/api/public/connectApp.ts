import { AppConnectRepository } from '../../repository/AppConnectRepository'
import { ConnectAppResponse } from '../../../types/messages/response/ConnectAppResponse'
import { EventData } from '../../../types'
import { PublicAPIContext, PublicAPIHandler } from '../PublicAPIHandler'
import { PageStateService } from '../../services/PageStateService'
import { WalletRepository } from '../../repository/WalletRepository'
import { StorageAdapter } from '../../storage/storageAdapter'
import { AppConnectStatus } from '../../../types/enums/AppConnectStatus'

interface AppConnectRequestPayload {
  url: string
}

export class ConnectAppHandler implements PublicAPIHandler {
  appConnectRepository: AppConnectRepository
  pageStateService: PageStateService
  walletRepository: WalletRepository
  storageAdapter: StorageAdapter

  constructor (appConnectRepository: AppConnectRepository, pageStateService: PageStateService, walletRepository: WalletRepository, storageAdapter: StorageAdapter) {
    this.appConnectRepository = appConnectRepository
    this.pageStateService = pageStateService
    this.walletRepository = walletRepository
    this.storageAdapter = storageAdapter
  }

  async handle (event: EventData, context: PublicAPIContext): Promise<ConnectAppResponse> {
    const payload: AppConnectRequestPayload = event.payload

    // The connection belongs to the origin the browser reports, so a page
    // cannot ask for one in the name of another website.
    if (payload.url !== context.origin) {
      throw new Error(`Connection must be requested for the calling origin ${context.origin}`)
    }

    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet loaded in the extension')
    }

    let appConnect = context.appConnect

    // todo remove after events system
    if (appConnect?.status === AppConnectStatus.rejected) {
      await this.appConnectRepository.removeById(appConnect.id)
      appConnect = null
    }

    if (appConnect == null) {
      appConnect = await this.appConnectRepository.create(context.origin)
    }

    // Nothing about the wallet leaves the extension until the user approves the
    // connection, and then only the identities they granted - the same filter
    // the events pushed to the page go through.
    const approved = appConnect.status === AppConnectStatus.approved
    const { identities, currentIdentity } = await this.pageStateService.visible(appConnect)

    return {
      redirectUrl: chrome.runtime.getURL(`index.html#/connect/${appConnect.id}`),
      status: appConnect.status,
      identities,
      currentIdentity,
      network: approved ? await this.storageAdapter.get('network') as string : null
    }
  }

  validatePayload (payload: AppConnectRequestPayload): null | string {
    // check it is a string
    if (typeof payload?.url !== 'string') {
      return 'Url is missing'
    }
    try {
      const url = new URL(payload.url)

      if (!['http:', 'https:'].includes(url.protocol)) {
        return 'Bad protocol'
      }

      if (url.port !== '' && (isNaN(Number(url.port)) || Number(url.port) > 65535)) {
        return 'Port number is not valid'
      }

      if (payload.url !== url.origin) {
        return 'Bad origin'
      }

      return null
    } catch (error) {
      return 'Invalid URL format'
    }
  }
}
