import { AppConnectRepository } from '../../repository/AppConnectRepository'
import { ConnectAppResponse } from '../../../types/messages/response/ConnectAppResponse'
import { EventData } from '../../../types'
import { APIHandler } from '../APIHandler'
import hash from 'hash.js'
import { IdentitiesRepository } from '../../repository/IdentitiesRepository'
import { WalletRepository } from '../../repository/WalletRepository'
import { StorageAdapter } from '../../storage/storageAdapter'
import { MESSAGING_TIMEOUT } from '../../../constants'

interface AppConnectRequestPayload {
  url: string
}

const POPUP_CLOSED_POLL_INTERVAL_MS = 300

export class ConnectAppHandler implements APIHandler {
  appConnectRepository: AppConnectRepository
  identitiesRepository: IdentitiesRepository
  walletRepository: WalletRepository
  storageAdapter: StorageAdapter

  constructor (appConnectRepository: AppConnectRepository, identitiesRepository: IdentitiesRepository, walletRepository: WalletRepository, storageAdapter: StorageAdapter) {
    this.appConnectRepository = appConnectRepository
    this.identitiesRepository = identitiesRepository
    this.walletRepository = walletRepository
    this.storageAdapter = storageAdapter
  }

  async handle (event: EventData): Promise<ConnectAppResponse> {
    const payload: AppConnectRequestPayload = event.payload
    const requestId = event.id

    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet loaded in the extension')
    }

    const existing = await this.appConnectRepository.getByURL(payload.url)

    if (existing != null) {
      return await this.buildResponse(wallet.currentIdentity)
    }

    const network = await this.storageAdapter.get('network') as string
    const walletId = await this.storageAdapter.get('currentWalletId') as string
    const storageKey = `appConnects_${network}_${walletId}`
    const id = hash.sha256().update(payload.url).digest('hex').substring(0, 6)

    const redirectUrl = chrome.runtime.getURL(`index.html#/connect/${requestId}?url=${encodeURIComponent(payload.url)}`)
    const popup = window.open(redirectUrl, 'connectApp', 'popup, width=430, height=600')

    return await new Promise<ConnectAppResponse>((resolve, reject) => {
      let settled = false

      const cleanup = (): void => {
        chrome.storage.onChanged.removeListener(onStorageChange)
        clearInterval(closedCheck)
        clearTimeout(timeoutHandle)
      }

      const onStorageChange = (changes: Record<string, chrome.storage.StorageChange>, area: string): void => {
        if (settled) return
        if (area !== 'local') return
        const change = changes[storageKey]
        if (change?.newValue == null) return
        const record = (change.newValue as Record<string, unknown>)[id]
        if (record == null) return

        settled = true
        cleanup()
        this.buildResponse(wallet.currentIdentity)
          .then(resolve)
          .catch(reject)
      }

      const closedCheck = setInterval(() => {
        if (settled) return
        if (popup == null || popup.closed) {
          settled = true
          cleanup()
          reject(new Error('App connection was rejected'))
        }
      }, POPUP_CLOSED_POLL_INTERVAL_MS)

      const timeoutHandle = setTimeout(() => {
        if (settled) return
        settled = true
        cleanup()
        reject(new Error('Timed out waiting for app connect approval'))
      }, MESSAGING_TIMEOUT)

      chrome.storage.onChanged.addListener(onStorageChange)
    })
  }

  private async buildResponse (currentIdentity: string | null): Promise<ConnectAppResponse> {
    const identities = await this.identitiesRepository.getAll()
    const network = await this.storageAdapter.get('network') as string

    return {
      identities: identities.map(identity => ({
        identifier: identity.identifier,
        type: identity.type,
        proTxHash: identity.proTxHash
      })),
      currentIdentity,
      network
    }
  }

  validatePayload (payload: AppConnectRequestPayload): null | string {
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
