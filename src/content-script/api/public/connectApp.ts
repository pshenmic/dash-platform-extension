import { AppConnectRepository } from '../../repository/AppConnectRepository'
import { ConnectAppResponse } from '../../../types/messages/response/ConnectAppResponse'
import { EventData } from '../../../types'
import { APIHandler } from '../APIHandler'
import hash from 'hash.js'
import { IdentitiesRepository } from '../../repository/IdentitiesRepository'
import { WalletRepository } from '../../repository/WalletRepository'

interface AppConnectRequestPayload {
  url: string
}

export class ConnectAppHandler implements APIHandler {
  appConnectRepository: AppConnectRepository
  identitiesRepository: IdentitiesRepository
  walletRepository: WalletRepository

  constructor (appConnectRepository: AppConnectRepository, identitiesRepository: IdentitiesRepository, walletRepository: WalletRepository) {
    this.appConnectRepository = appConnectRepository
    this.identitiesRepository = identitiesRepository
    this.walletRepository = walletRepository
  }

  async handle (event: EventData): Promise<ConnectAppResponse> {
    const payload: AppConnectRequestPayload = event.payload

    const id = hash.sha256().update(payload.url).digest('hex').substring(0, 6)

    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet loaded in the extension')
    }

    let appConnect = await this.appConnectRepository.getById(id)

    if (appConnect == null) {
      appConnect = await this.appConnectRepository.create(payload.url)
    }

    const identities = await this.identitiesRepository.getAll()

    return {
      redirectUrl: chrome.runtime.getURL(`index.html#/connect/${appConnect.id}`),
      status: appConnect.status,
      identities: identities.map(identity => ({ identifier: identity.identifier, type: identity.type, proTxHash: identity.proTxHash })),
      currentIdentity: wallet.currentIdentity
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
