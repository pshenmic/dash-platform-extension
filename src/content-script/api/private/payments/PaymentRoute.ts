import { Wallet } from '../../../../types/Wallet'
import { WalletRepository } from '../../../repository/WalletRepository'
import { PaymentAddressType, PaymentRequest, PaymentSourceType, RecordedPaymentTransaction } from '../../../../types/PaymentRequest'
import { PaymentTransaction, SendPaymentResult } from '../../../../types/SendPaymentResult'

// The wallet a request was made against, loaded through its own scope: a
// payment keeps its context however the current selection changes meanwhile.
export interface PaymentRouteContext {
  wallet: Wallet
  walletRepository: WalletRepository
}

export interface PaymentQuote {
  // What the recipient receives: the amount the website asked for.
  amountDuffs: bigint
  // Everything charged on top of it.
  feeDuffs: bigint
}

export interface PreparedPayment {
  feeDuffs: bigint
  // Signed and kept with their bytes, none of them on the network yet. They
  // are written into the request before `send` runs.
  transactions: RecordedPaymentTransaction[]
}

export interface PaymentOutcome {
  delivery: SendPaymentResult['delivery']
  transactions: PaymentTransaction[]
}

/**
 * One way to pay a recipient: from one source layer to one recipient layer.
 *
 * A route is driven in three steps the approval handler sequences. `quote`
 * prices it with nothing signed. `prepare` signs, and must leave nothing on the
 * network, so a failure there is free to retry. `send` puts the request's
 * recorded transactions on the network and must be safe to repeat: it runs
 * again, with the same transactions and without the password, to finish a
 * payment an earlier attempt left unfinished.
 *
 * A route built on a chain whose own handler journals its steps and resumes on
 * a repeated call (an asset lock, a shielded proof) may record nothing in
 * `prepare` and do the work in `send`; finishing it then means running that
 * handler again, which needs the password once more.
 */
export interface PaymentRoute {
  source: PaymentSourceType
  recipient: PaymentAddressType
  quote: (request: PaymentRequest, context: PaymentRouteContext) => Promise<PaymentQuote>
  prepare: (request: PaymentRequest, context: PaymentRouteContext, password: string) => Promise<PreparedPayment>
  send: (request: PaymentRequest, context: PaymentRouteContext) => Promise<PaymentOutcome>
}
