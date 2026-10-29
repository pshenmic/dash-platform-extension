import { EventData } from '../../../types/EventData'
import { PublicAPIContext, PublicAPIHandler } from '../PublicAPIHandler'
import { PaymentRequestsRepository } from '../../repository/PaymentRequestsRepository'
import { WalletRepository } from '../../repository/WalletRepository'
import { RequestSendPaymentPayload } from '../../../types/messages/payloads/RequestSendPaymentPayload'
import { RequestSendPaymentResponse } from '../../../types/messages/response/RequestSendPaymentResponse'
import { PaymentRequest } from '../../../types/PaymentRequest'
import { PaymentRequestStatus } from '../../../types/enums/PaymentRequestStatus'
import { WalletType } from '../../../types/WalletType'
import { parsePaymentAddress } from '../../../utils/paymentAddress'
import { paymentSourcesFor, toPaymentRequestView, validatePaymentAmount } from '../../../utils/paymentRequests'
import { bytesToHex } from '../../../utils'

const RECIPIENT_LABELS = {
  core: 'a Core address',
  platform: 'a Platform address',
  orchard: 'an Orchard address'
}

// A website asks to pay an address. Nothing is paid here: the request is
// written down, bound to the origin that asked and to the wallet and network
// that are current, and the website opens the page where the user decides.
//
// Each call is a payment of its own, with a fresh id. The same address and
// amount asked for twice are two payments, and the user confirms each one.
export class RequestSendPaymentHandler implements PublicAPIHandler {
  paymentRequestsRepository: PaymentRequestsRepository
  walletRepository: WalletRepository

  constructor (paymentRequestsRepository: PaymentRequestsRepository, walletRepository: WalletRepository) {
    this.paymentRequestsRepository = paymentRequestsRepository
    this.walletRepository = walletRepository
  }

  async handle (event: EventData, context: PublicAPIContext): Promise<RequestSendPaymentResponse> {
    const payload: RequestSendPaymentPayload = event.payload
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet loaded in the extension')
    }

    // Only a seed phrase wallet holds keys for Core, Platform or Orchard funds.
    if (wallet.type !== WalletType.seedphrase) {
      throw new Error('The current wallet cannot make payments: it has no seed phrase')
    }

    const recipient = parsePaymentAddress(payload.address, wallet.network)

    if (paymentSourcesFor(recipient.type).length === 0) {
      throw new Error(`Payments to ${RECIPIENT_LABELS[recipient.type]} are not supported yet`)
    }

    const amountError = validatePaymentAmount(payload.amountDuffs, recipient.type)

    if (amountError != null) {
      throw new Error(amountError)
    }

    const request: PaymentRequest = {
      id: bytesToHex(crypto.getRandomValues(new Uint8Array(16))),
      origin: context.origin,
      network: wallet.network,
      walletId: wallet.walletId,
      address: recipient.address,
      addressType: recipient.type,
      amountDuffs: payload.amountDuffs,
      status: PaymentRequestStatus.pending,
      createdAt: Date.now(),
      source: null,
      feeDuffs: null,
      transactions: [],
      result: null,
      error: null
    }

    await this.paymentRequestsRepository.create(request)

    return {
      ...toPaymentRequestView(request),
      redirectUrl: chrome.runtime.getURL(`index.html#/payment/${request.id}`)
    }
  }

  validatePayload (payload: RequestSendPaymentPayload): null | string {
    if (typeof payload?.address !== 'string' || payload.address.length === 0) {
      return 'address must be a non-empty string'
    }

    return validatePaymentAmount(payload.amountDuffs)
  }
}
