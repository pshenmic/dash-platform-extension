import { AbstractSigner, WalletInfo } from 'dash-platform-sdk/src/signer/AbstractSigner'
import { StateTransitionWASM } from 'pshenmic-dpp/dist/wasm'
import { hexToBytes, popupWindow, wait } from '../utils'
import { MESSAGING_TIMEOUT } from '../constants'
import { StateTransitionStatus } from '../types/enums/StateTransitionStatus'
import { PublicAPIClient } from '../types'
import { base64 } from '@scure/base'
import {
  RequestStateTransitionApprovalResponse
} from '../types/messages/response/RequestStateTransitionApprovalResponse'
import { ConnectAppResponse } from '../types/messages/response/ConnectAppResponse'

export class ExtensionSigner implements AbstractSigner {
  publicAPIClient: PublicAPIClient

  constructor (publicAPIClient: PublicAPIClient) {
    this.publicAPIClient = publicAPIClient
  }

  async connect (): Promise<WalletInfo> {
    const url = window.location.origin

    let response: ConnectAppResponse = await this.publicAPIClient.connectApp(url)

    if (response.status === 'pending') {
      popupWindow(response.redirectUrl, 'connectApp', window, 430, 600)
    }

    const startTimestamp = new Date()

    while (response.status === StateTransitionStatus.pending) {
      await wait(500)

      if (new Date().getTime() - startTimestamp.getTime() > MESSAGING_TIMEOUT) {
        throw new Error('Failed to receive state transition signing approval due timeout')
      }

      response = await this.publicAPIClient.connectApp(url)
    }

    if (response.status === 'error') {
      throw new Error('An error occurred while connecting app')
    }

    if (response.status === 'rejected') {
      throw new Error('App connection was rejected')
    }

    return { currentIdentity: response.currentIdentity, identities: response.identities }
  }

  async signAndBroadcast (stateTransitionWASM: StateTransitionWASM): Promise<StateTransitionWASM> {
    let response: RequestStateTransitionApprovalResponse = await this.publicAPIClient.requestTransactionApproval(base64.encode(stateTransitionWASM.bytes()))

    popupWindow(response.redirectUrl, 'approval', window, 430, 600)

    const startTimestamp = new Date()

    while (response.stateTransition.status === StateTransitionStatus.pending) {
      await wait(500)

      if (new Date().getTime() - startTimestamp.getTime() > MESSAGING_TIMEOUT) {
        throw new Error('Failed to receive state transition signing approval due timeout')
      }

      response = await this.publicAPIClient.requestTransactionApproval(stateTransitionWASM.base64())
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
