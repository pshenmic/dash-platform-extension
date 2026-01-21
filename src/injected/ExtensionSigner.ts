import { StateTransitionWASM } from 'pshenmic-dpp'
import {hexToBytes, popupWindow, validateHex, wait} from '../utils'
import { MESSAGING_TIMEOUT } from '../constants'
import { StateTransitionStatus } from '../types/enums/StateTransitionStatus'
import { PublicAPIClient } from '../types'
import { base64 } from '@scure/base'
import {
  RequestStateTransitionApprovalResponse
} from '../types/messages/response/RequestStateTransitionApprovalResponse'
import { ConnectAppResponse } from '../types/messages/response/ConnectAppResponse'
import { WalletInfo } from '../types/WalletInfo'

export class ExtensionSigner {
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

  async signAndBroadcast (stateTransition: StateTransitionWASM | string | Uint8Array): Promise<StateTransitionWASM> {
    let stateTransitionWASM: StateTransitionWASM

    // hex or base64
    if (typeof stateTransition === 'string') {
      if (validateHex((stateTransition as string).substring(0, 32))) {
        stateTransitionWASM = StateTransitionWASM.fromHex(stateTransition as string)
      } else {
        stateTransitionWASM = StateTransitionWASM.fromBase64(stateTransition as string)
      }
      // Uint8Array (bytes)
    } else if (typeof stateTransition === 'object' && (stateTransition as Uint8Array) instanceof Uint8Array) {
      stateTransitionWASM = StateTransitionWASM.fromBytes(stateTransition as Uint8Array)
    } else if (typeof stateTransition === 'object' && (stateTransition as StateTransitionWASM).__type === 'StateTransitionWASM') {
      stateTransitionWASM = stateTransition as StateTransitionWASM
    } else {
      throw new Error("Unrecognized state transition type, must be StateTransitionWASM or string hex or string base64 or Uint8Array")
    }

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
