// This file injects on webpages by extension
import { ExtensionSigner } from './ExtensionSigner'
import { PublicAPIClient } from '../types/PublicAPIClient'
import { requestSendPayment, SendPaymentParams } from './requestSendPayment'
import { SendPaymentResult } from '../types/SendPaymentResult'

declare global {
  interface Window {
    dashPlatformExtension: {
      signer: ExtensionSigner
      requestSendPayment: (params: SendPaymentParams) => Promise<SendPaymentResult>
    }
  }
}

// initialize messaging layer
const publicAPIClient = new PublicAPIClient()

// create custom signer function for DashPlatformSDK
const extensionSigner = new ExtensionSigner(publicAPIClient)

window.dashPlatformExtension = {
  signer: extensionSigner,
  requestSendPayment: async (params: SendPaymentParams) => await requestSendPayment(publicAPIClient, params)
}

console.log('Dash Platform Extension messaging bridge initialized')
