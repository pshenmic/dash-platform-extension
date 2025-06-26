import ipValidator from 'is-my-ip-valid'
import { AppConnectRepository } from '../../repository/AppConnectRepository'
import { ConnectAppResponse } from '../../../types/messages/response/ConnectAppResponse'
import { EventData } from '../../../types/EventData'
import { APIHandler } from '../APIHandler'
import hash from "hash.js";
import {IdentitiesRepository} from "../../repository/IdentitiesRepository";

const validateIp = ipValidator({ version: 4 })

interface AppConnectRequestPayload {
  url: string
}

export class ConnectAppHandler implements APIHandler {
  appConnectRepository: AppConnectRepository
  identitiesRepository: IdentitiesRepository

  constructor (appConnectRepository: AppConnectRepository, identitiesRepository: IdentitiesRepository) {
    this.appConnectRepository = appConnectRepository
    this.identitiesRepository = identitiesRepository
  }

  async handle (event: EventData): Promise<ConnectAppResponse> {
    const payload: AppConnectRequestPayload = event.payload

    const id = hash.sha256().update(payload.url).digest('hex').substring(0, 6)

    let appConnect = await this.appConnectRepository.getById(id)

    if (appConnect == null) {
      appConnect = await this.appConnectRepository.create(payload.url)
    }

    const identities = await this.identitiesRepository.getAll();
    const currentIdentity = await this.identitiesRepository.getCurrent();

    return {
      redirectUrl: chrome.runtime.getURL(`index.html#/connect/${appConnect.id}`),
      status: appConnect.status,
      identities: identities.map(identity => identity.identifier),
      currentIdentity: currentIdentity ? currentIdentity.identifier : null
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
