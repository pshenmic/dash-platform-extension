import { DashPlatformSDK } from 'dash-platform-sdk'
import { EventData } from '../../types/EventData'
import { StorageAdapter } from '../storage/storageAdapter'
import { AppConnectRepository } from '../repository/AppConnectRepository'
import { StateTransitionsRepository } from '../repository/StateTransitionsRepository'
import { MessagingMethods } from '../../types/enums/MessagingMethods'
import { PublicAPIHandler } from './PublicAPIHandler'
import { AppConnectStatus } from '../../types/enums/AppConnectStatus'
import { ConnectAppHandler } from './public/connectApp'
import { RequestStateTransitionApprovalHandler } from './public/requestStateTransitionApproval'
import { IdentitiesRepository } from '../repository/IdentitiesRepository'
import { WalletRepository } from '../repository/WalletRepository'
import { PaymentRequestsRepository } from '../repository/PaymentRequestsRepository'
import { RequestSendPaymentHandler } from './public/requestSendPayment'
import { GetPaymentStatusHandler } from './public/getPaymentStatus'
import { CancelPaymentRequestHandler } from './public/cancelPaymentRequest'
import { OpenRequestPopupHandler } from './public/openRequestPopup'
import { ext } from '../../platform'
import { OPEN_POPUP_MESSAGE, OpenPopupRequest, OpenPopupResponse } from '../../types/RequestWindow'

// Allowed before the website is connected: asking for a connection, and
// showing that request to the user.
const UNCONNECTED_METHODS: string[] = [
  MessagingMethods.CONNECT_APP,
  MessagingMethods.OPEN_REQUEST_POPUP
]

// These act only on a payment request the calling origin made itself, and a
// request keeps the wallet and network it was made against. The website has to
// follow it to the end even after the user switches to a wallet it has no
// connection to, so they answer to the request's origin rather than to the
// current connection.
const REQUEST_BOUND_METHODS: string[] = [
  MessagingMethods.GET_PAYMENT_STATUS,
  MessagingMethods.CANCEL_PAYMENT_REQUEST
]

// Only the extension can open its toolbar popup, so the service worker is
// asked to. No answer counts as a no: the website then opens a window itself.
const openPopup = async (path: string): Promise<boolean> => {
  const request: OpenPopupRequest = { context: 'dash-platform-extension', type: OPEN_POPUP_MESSAGE, path }
  const response: OpenPopupResponse | undefined = await ext.runtime.sendMessage(request)

  return response?.ok === true
}

/**
 * Handlers for a messages from a webpage to extension (potentially insecure)
 */
export class PublicAPI {
  sdk: DashPlatformSDK
  storageAdapter: StorageAdapter
  appConnectRepository: AppConnectRepository
  stateTransitionsRepository: StateTransitionsRepository
  identitiesRepository: IdentitiesRepository
  walletRepository: WalletRepository

  constructor (sdk: DashPlatformSDK, storageAdapter: StorageAdapter) {
    this.sdk = sdk
    this.storageAdapter = storageAdapter
  }

  handlers: {
    [key: string]: PublicAPIHandler
  }

  async handleMessage (event: MessageEvent): Promise<any> {
    const { origin, data } = event
    const { method, payload } = data

    const handler = this.handlers[method]

    if (handler == null) {
      throw new Error(`Could not find handler for method ${method as string}`)
    }

    const requestBound = REQUEST_BOUND_METHODS.includes(method)
    const appConnect = requestBound ? null : await this.appConnectRepository.getByURL(origin)

    // Connecting is the one thing an unknown origin may ask for. Everything
    // else needs an approved connection, and the handler is handed it so that
    // it can serve only what this website was granted.
    if (!UNCONNECTED_METHODS.includes(method) && !requestBound && (appConnect == null || appConnect.status !== AppConnectStatus.approved)) {
      throw new Error(`Application on url ${origin} is not authorized`)
    }

    const validation = handler.validatePayload(payload)

    if (validation != null) {
      throw new Error(`Invalid payload: ${validation}`)
    }

    return await handler.handle(data, { origin, appConnect })
  }

  init (): void {
    this.buildHandlers()
    this.listen()
  }

  buildHandlers (): void {
    const appConnectRepository = new AppConnectRepository(this.storageAdapter)
    this.appConnectRepository = appConnectRepository

    const stateTransitionsRepository = new StateTransitionsRepository(this.storageAdapter)
    this.stateTransitionsRepository = stateTransitionsRepository

    const identitiesRepository = new IdentitiesRepository(this.storageAdapter, this.sdk)
    this.identitiesRepository = identitiesRepository

    const walletRepository = new WalletRepository(this.storageAdapter, this.identitiesRepository)
    this.walletRepository = walletRepository

    const paymentRequestsRepository = new PaymentRequestsRepository(this.storageAdapter)

    this.handlers = {
      [MessagingMethods.CONNECT_APP]: new ConnectAppHandler(appConnectRepository, identitiesRepository, walletRepository, this.storageAdapter),
      [MessagingMethods.REQUEST_STATE_TRANSITION_APPROVAL]: new RequestStateTransitionApprovalHandler(stateTransitionsRepository),
      [MessagingMethods.REQUEST_SEND_PAYMENT]: new RequestSendPaymentHandler(paymentRequestsRepository, walletRepository),
      [MessagingMethods.GET_PAYMENT_STATUS]: new GetPaymentStatusHandler(paymentRequestsRepository, walletRepository),
      [MessagingMethods.CANCEL_PAYMENT_REQUEST]: new CancelPaymentRequestHandler(paymentRequestsRepository),
      [MessagingMethods.OPEN_REQUEST_POPUP]: new OpenRequestPopupHandler(paymentRequestsRepository, openPopup)
    }
  }

  listen (): void {
    window.addEventListener('message', (message: MessageEvent) => {
      const data = message.data as EventData

      const { context, type, id, method } = data

      if (context !== 'dash-platform-extension' || type === 'response') {
        return
      }

      this.handleMessage(message)
        .then((result: any) => {
          const message: EventData = {
            id,
            context: 'dash-platform-extension',
            type: 'response',
            method,
            payload: result,
            error: null
          }

          window.postMessage(message)
        })
        .catch(e => {
          const message: EventData = {
            id,
            context: 'dash-platform-extension',
            type: 'response',
            method,
            payload: null,
            error: e.message
          }

          window.postMessage(message)
        })
    }, true)
  }
}
