import { PaymentOutcome, PaymentQuote, PaymentRoute, PaymentRouteContext, PreparedPayment } from './PaymentRoute'
import { CoreSpendService } from '../../../services/CoreSpendService'
import { CoreExplorerService } from '../../../services/CoreExplorerService'
import { PaymentRequest } from '../../../../types/PaymentRequest'
import { PaymentNotSentError } from '../../../errors/PaymentNotSentError'
import { findConflictingSpend } from '../../../../utils/conflictingSpend'
import { bytesToHex } from '../../../../utils'

const ACCOUNT = 0

// Pays a Core address out of the wallet's own Core outputs: one transaction,
// the same coin selection and signing SEND_CORE_TRANSACTION runs. The
// recipient's output carries exactly the requested amount and the fee comes out
// of the change.
export class CoreToCorePaymentRoute implements PaymentRoute {
  source = 'core' as const
  recipient = 'core' as const

  coreSpend: CoreSpendService
  coreExplorer: CoreExplorerService

  constructor (coreSpend: CoreSpendService, coreExplorer: CoreExplorerService) {
    this.coreSpend = coreSpend
    this.coreExplorer = coreExplorer
  }

  async quote (request: PaymentRequest, context: PaymentRouteContext): Promise<PaymentQuote> {
    const plan = await this.coreSpend.plan({
      wallet: context.wallet,
      xpub: await this.getXpub(context),
      account: ACCOUNT,
      outputs: [{ address: request.address, amountDuffs: BigInt(request.amountDuffs) }]
    })

    return { amountDuffs: plan.amountDuffs, feeDuffs: plan.feeDuffs }
  }

  async prepare (request: PaymentRequest, context: PaymentRouteContext, password: string): Promise<PreparedPayment> {
    const prepared = await this.coreSpend.prepare({
      wallet: context.wallet,
      xpub: await this.getXpub(context),
      account: ACCOUNT,
      outputs: [{ address: request.address, amountDuffs: BigInt(request.amountDuffs) }],
      password
    })

    return {
      feeDuffs: prepared.feeDuffs,
      transactions: [{ type: 'core', txid: prepared.txid, hex: bytesToHex(prepared.transaction.bytes()) }]
    }
  }

  async send (request: PaymentRequest, context: PaymentRouteContext): Promise<PaymentOutcome> {
    const [transaction] = request.transactions

    if (transaction?.type !== 'core' || transaction.hex == null) {
      throw new Error(`Payment request ${request.id} has no signed Core transaction to send`)
    }

    // The first send and every repeat put the same bytes on the network, which
    // either takes them or already has them: the recipient is paid once.
    try {
      await this.coreSpend.rebroadcast(transaction.txid, transaction.hex)
    } catch (e) {
      // An explorer that cannot answer leaves the outcome open, and the error
      // that matters is the one the network gave.
      const conflict = await findConflictingSpend(this.coreExplorer, transaction.txid, transaction.hex, context.wallet.network)
        .catch(() => null)

      if (conflict != null) {
        throw new PaymentNotSentError(
          `Transaction ${transaction.txid} can never confirm: transaction ${conflict} has spent one of its inputs. Nothing was paid`
        )
      }

      throw e
    }

    return { delivery: 'sent', transactions: [{ type: 'core', txid: transaction.txid }] }
  }

  private async getXpub (context: PaymentRouteContext): Promise<string> {
    if (context.wallet.type !== 'seedphrase') {
      throw new Error('Paying from Core is only supported for a seedphrase wallet')
    }

    const xpub = await context.walletRepository.getCoreAccountXpub(ACCOUNT)

    if (xpub == null) {
      throw new Error('Core addresses of this wallet are not initialized yet: unlock the wallet in the extension first')
    }

    return xpub
  }
}
