import { ApproveAppConnectHandler } from '../content-script/api/private/appConnect/approveAppConnect'
import { AppConnectRepository } from '../content-script/repository/AppConnectRepository'
import { ExtensionStorageAdapter } from '../content-script/storage/extensionStorageAdapter'
import { APIHandler } from '../content-script/api/APIHandler'
import { MessagingMethods } from '../types/enums/MessagingMethods'
import { EventData } from '../types'

// Popup-scoped PrivateAPI handlers. These run in the popup's JS context
// (same frame as the UI) so .dispatch fanout delivers them reliably without
// crossing the popup ↔ content-script boundary, which is fragile in Chrome 130+.
// Content-script's PrivateAPI silently skips methods not in its own map.
export function initPopupMessaging (): void {
  const storageAdapter = new ExtensionStorageAdapter()
  const appConnectRepository = new AppConnectRepository(storageAdapter)

  const handlers: Record<string, APIHandler> = {
    [MessagingMethods.APPROVE_APP_CONNECT]: new ApproveAppConnectHandler(appConnectRepository)
  }

  chrome.runtime.onMessage.addListener((data: EventData) => {
    const { context, type, id, method } = data

    if (context !== 'dash-platform-extension' || type === 'response') {
      return
    }

    const handler = handlers[method]
    if (handler == null) {
      return
    }

    const validation = handler.validatePayload(data.payload)
    if (validation != null) {
      const errorMessage: EventData = {
        id,
        context: 'dash-platform-extension',
        type: 'response',
        method,
        payload: null,
        error: `Invalid payload: ${validation}`
      }
      // @ts-expect-error
      chrome.runtime.onMessage.dispatch(errorMessage)
      return
    }

    handler.handle(data)
      .then((result: any) => {
        const response: EventData = {
          id,
          context: 'dash-platform-extension',
          type: 'response',
          method,
          payload: result,
          error: null
        }
        // @ts-expect-error
        chrome.runtime.onMessage.dispatch(response)
      })
      .catch(e => {
        const response: EventData = {
          id,
          context: 'dash-platform-extension',
          type: 'response',
          method,
          payload: null,
          error: e.message
        }
        // @ts-expect-error
        chrome.runtime.onMessage.dispatch(response)
      })
  })
}
