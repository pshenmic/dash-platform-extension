import { StateTransitionWASM } from 'dash-platform-sdk/types'
import { hexToBytes, popupWindow, validateHex } from '../utils'
import { PageEvents } from './PageEvents'
import { PageEventName } from '../types/PageState'
import { MESSAGING_TIMEOUT } from '../constants'
import { StateTransitionStatus } from '../types/enums/StateTransitionStatus'
import { PublicAPIClient } from '../types'
import { base64 } from '@scure/base'
import {
  RequestStateTransitionApprovalResponse
} from '../types/messages/response/RequestStateTransitionApprovalResponse'
import { ConnectAppResponse } from '../types/messages/response/ConnectAppResponse'
import { WalletInfo } from '../types/WalletInfo'

// How often the closing of an approval window is noticed. It is a property of
// the window object in this page, not a question asked of the extension.
const POPUP_CLOSED_CHECK_MS = 500

export class ExtensionSigner {
  publicAPIClient: PublicAPIClient
  pageEvents: PageEvents

  constructor (publicAPIClient: PublicAPIClient, pageEvents: PageEvents) {
    this.publicAPIClient = publicAPIClient
    this.pageEvents = pageEvents
  }

  /**
   * Waits for the extension to say that the user answered, instead of asking it
   * again twice a second. Also returns when the approval window is closed
   * without an answer, which the caller tells apart by reading the request once
   * more, and gives up after the same timeout as before.
   */
  private async waitForAnswer (event: PageEventName, matches: (payload: any) => boolean, popupRef: Window | null): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const listener = (payload: any): void => {
        if (matches(payload)) {
          stop()
          resolve()
        }
      }

      const closedCheck = setInterval(() => {
        if (popupRef?.closed === true) {
          stop()
          resolve()
        }
      }, POPUP_CLOSED_CHECK_MS)

      const timeout = setTimeout(() => {
        stop()
        reject(new Error('Failed to receive state transition signing approval due timeout'))
      }, MESSAGING_TIMEOUT)

      const stop = (): void => {
        clearInterval(closedCheck)
        clearTimeout(timeout)
        this.pageEvents.off(event, listener)
      }

      this.pageEvents.on(event, listener)
    })
  }

  async connect (): Promise<WalletInfo> {
    const url = window.location.origin

    let response: ConnectAppResponse = await this.publicAPIClient.connectApp(url)

    let popupRef: Window | null = null
    if (response.status === 'pending') {
      popupRef = popupWindow(response.redirectUrl, 'connectApp', window, 430, 600)
    }

    while (response.status === StateTransitionStatus.pending) {
      await this.waitForAnswer(PageEventName.connectionStatusChanged, payload => payload?.status !== 'pending', popupRef)

      response = await this.publicAPIClient.connectApp(url)

      // Checked after reading the answer so Approve/Reject resolve through the
      // normal path first.
      if (response.status === StateTransitionStatus.pending && popupRef?.closed === true) {
        throw new Error('App connection was rejected')
      }
    }

    if (response.status === 'error') {
      throw new Error('An error occurred while connecting app')
    }

    if (response.status === 'rejected') {
      throw new Error('App connection was rejected')
    }

    return { currentIdentity: response.currentIdentity, identities: response.identities }
  }

  async signAndBroadcast (stateTransition: StateTransitionWASM | string | Uint8Array): Promise<StateTransitionWASM> {
    let stateTransitionWASM: StateTransitionWASM

    // hex or base64
    if (typeof stateTransition === 'string') {
      if (validateHex((stateTransition).substring(0, 32))) {
        stateTransitionWASM = StateTransitionWASM.fromHex(stateTransition)
      } else {
        stateTransitionWASM = StateTransitionWASM.fromBase64(stateTransition)
      }
      // Uint8Array (bytes)
    } else if (typeof stateTransition === 'object' && (stateTransition as Uint8Array) instanceof Uint8Array) {
      stateTransitionWASM = StateTransitionWASM.fromBytes(stateTransition as Uint8Array)
    } else if (stateTransition instanceof StateTransitionWASM) {
      stateTransitionWASM = stateTransition
    } else {
      throw new Error('Unrecognized state transition type, must be StateTransitionWASM or string hex or string base64 or Uint8Array')
    }

    let response: RequestStateTransitionApprovalResponse = await this.publicAPIClient.requestTransactionApproval(base64.encode(stateTransitionWASM.bytes()))

    const popupRef = popupWindow(response.redirectUrl, 'approval', window, 430, 600)

    while (response.stateTransition.status === StateTransitionStatus.pending) {
      const unsignedHash = response.stateTransition.unsignedHash

      await this.waitForAnswer(PageEventName.stateTransitionResolved, payload => payload?.unsignedHash === unsignedHash, popupRef)

      response = await this.publicAPIClient.requestTransactionApproval(stateTransitionWASM.base64())

      // The window closed with the request still unanswered: nobody is going to
      // answer it now.
      if (response.stateTransition.status === StateTransitionStatus.pending && popupRef?.closed === true) {
        throw new Error('Transaction signing was rejected')
      }
    }

    if (response.stateTransition.status === StateTransitionStatus.rejected) {
      throw new Error('Transaction signing was rejected')
    }

    if (response.stateTransition.status === StateTransitionStatus.error) {
      throw new Error('Internal error during singing the transaction')
    }

    const { signature, signaturePublicKeyId } = response.stateTransition

    if (signature == null || signaturePublicKeyId == null) {
      throw new Error('Signature is missing')
    }

    stateTransitionWASM.signature = hexToBytes(signature)
    stateTransitionWASM.signaturePublicKeyId = signaturePublicKeyId

    return stateTransitionWASM
  }
}
