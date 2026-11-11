import { hexToBytes, popupWindow, validateHex, wait } from '../utils/browser'
import { MESSAGING_TIMEOUT } from '../constants'
import { StateTransitionStatus } from '../types/enums/StateTransitionStatus'
import { PublicAPIClient } from '../types'
import { base64 } from '@scure/base'
import {
  RequestStateTransitionApprovalResponse
} from '../types/messages/response/RequestStateTransitionApprovalResponse'
import { ConnectAppResponse } from '../types/messages/response/ConnectAppResponse'
import { WalletInfo } from '../types/WalletInfo'
import { SignedStateTransitionData } from '../types/SignedStateTransitionData'

export class ExtensionSigner {
  publicAPIClient: PublicAPIClient

  constructor (publicAPIClient: PublicAPIClient) {
    this.publicAPIClient = publicAPIClient
  }

  async connect (): Promise<WalletInfo> {
    const url = window.location.origin

    let response: ConnectAppResponse = await this.publicAPIClient.connectApp(url)

    let popupRef: Window | null = null
    if (response.status === 'pending') {
      popupRef = popupWindow(response.redirectUrl, 'connectApp', window, 430, 600)
    }

    const startTimestamp = new Date()

    while (response.status === StateTransitionStatus.pending) {
      await wait(500)

      if (new Date().getTime() - startTimestamp.getTime() > MESSAGING_TIMEOUT) {
        throw new Error('Failed to receive state transition signing approval due timeout')
      }

      response = await this.publicAPIClient.connectApp(url)

      // Checked after the handler poll so Approve/Reject status transitions
      // resolve through the normal path first.
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

  async signAndBroadcast (stateTransition: string): Promise<SignedStateTransitionData> {
    let stateTransitionBase64: string

    if (validateHex(stateTransition.substring(0, 32))) {
      stateTransitionBase64 = base64.encode(hexToBytes(stateTransition))
    } else {
      stateTransitionBase64 = stateTransition
    }

    let response: RequestStateTransitionApprovalResponse = await this.publicAPIClient.requestTransactionApproval(stateTransitionBase64)

    popupWindow(response.redirectUrl, 'approval', window, 430, 600)

    const startTimestamp = new Date()

    while (response.stateTransition.status === StateTransitionStatus.pending) {
      await wait(500)

      if (new Date().getTime() - startTimestamp.getTime() > MESSAGING_TIMEOUT) {
        throw new Error('Failed to receive state transition signing approval due timeout')
      }

      response = await this.publicAPIClient.requestTransactionApproval(stateTransitionBase64)
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

    return {
      signature,
      signaturePublicKeyId,
      unsignedBase64: stateTransitionBase64
    }
  }
}
