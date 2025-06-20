import { AbstractSigner } from 'dash-platform-sdk'
import { DashPlatformProtocolWASM, IdentityWASM, StateTransitionWASM } from 'pshenmic-dpp/dist/wasm'
import { hexToBytes, popupWindow, wait } from '../utils'
import { MESSAGING_TIMEOUT } from '../constants'
import { StateTransitionStatus } from '../types/enums/StateTransitionStatus'
import { PublicAPIClient } from '../types/PublicAPIClient'
import { base64 } from '@scure/base'
import {
  RequestStateTransitionApprovalResponse
} from '../types/messages/response/RequestStateTransitionApprovalResponse'

export class ExtensionSigner implements AbstractSigner {
  publicAPIClient: PublicAPIClient
  wasm: DashPlatformProtocolWASM

  constructor (publicAPIClient: PublicAPIClient, wasm: DashPlatformProtocolWASM) {
    this.publicAPIClient = publicAPIClient
    this.wasm = wasm
  }

  connect (): void {
    throw new Error('Method not implemented.')
  }

  getCurrentIdentity (): IdentityWASM {
    throw new Error('Method not implemented.')
  }

  async connectApp (url: string): Promise<void> {
    let response = await this.publicAPIClient.connectApp(url)

    popupWindow(response.redirectUrl, 'connect', window, 300, 300)

    const startTimestamp = new Date()

    while (response.status === 'pending') {
      await wait(500)

      if (new Date().getTime() - startTimestamp.getTime() > MESSAGING_TIMEOUT) {
        throw new Error('Failed to connect app due timeout')
      }

      response = await this.publicAPIClient.connectApp(url)
    }

    if (response.status === 'rejected') {
      throw new Error('Connection of the extension to the website was rejected')
    }
  }

  async signStateTransition (stateTransitionWASM: StateTransitionWASM): Promise<StateTransitionWASM> {
    let response: RequestStateTransitionApprovalResponse = await this.publicAPIClient.requestTransactionApproval(base64.encode(stateTransitionWASM.toBytes()))

    popupWindow(response.redirectUrl, 'approval', window, 300, 300)

    const startTimestamp = new Date()

    while (response.stateTransition.status === StateTransitionStatus.pending) {
      await wait(500)

      if (new Date().getTime() - startTimestamp.getTime() > MESSAGING_TIMEOUT) {
        throw new Error('Failed to receive state transition signing approval due timeout')
      }

      response = await this.publicAPIClient.requestTransactionApproval(stateTransitionWASM.toBase64())
    }

    if (response.stateTransition.status === StateTransitionStatus.rejected) {
      throw new Error('State transition signing error')
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
