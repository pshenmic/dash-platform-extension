import ipValidator from 'is-my-ip-valid'
import { AppConnectRepository } from '../../repository/AppConnectRepository'
import { ConnectAppResponse } from '../../../types/messages/response/ConnectAppResponse'
import { EventData } from '../../../types/EventData'
import { APIHandler } from '../APIHandler'
import hash from "hash.js";

const validateIp = ipValidator({ version: 4 })

interface AppConnectRequestPayload {
  url: string
}

export class ConnectAppHandler implements APIHandler {
  appConnectRepository: AppConnectRepository

  constructor (appConnectRepository: AppConnectRepository) {
    this.appConnectRepository = appConnectRepository
  }

  async handle (event: EventData): Promise<ConnectAppResponse> {
    const payload: AppConnectRequestPayload = event.payload

    const id = hash.sha256().update(payload.url).digest('hex').substring(0, 6)

    let appConnect = await this.appConnectRepository.getById(id)

    if (appConnect == null) {
      appConnect = await this.appConnectRepository.create(payload.url)

      return { redirectUrl: chrome.runtime.getURL(`index.html#/connect/${appConnect.id}`), status: appConnect.status }
    }

    return {
      redirectUrl: chrome.runtime.getURL(`index.html#/connect/${appConnect.id}`),
      status: appConnect.status
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

      if (url.port !== "" && (isNaN(Number(url.port)) || Number(url.port) > 65535)) {
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
