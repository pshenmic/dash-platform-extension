import { DashPlatformSDK } from 'dash-platform-sdk'
import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { CoreSpendService } from '../../../services/CoreSpendService'
import { CorePendingSpendsRepository } from '../../../repository/CorePendingSpendsRepository'
import { validateCoreAddress } from '../../../../utils'
import { SendCoreTransferPayload } from '../../../../types/messages/payloads/SendCoreTransferPayload'
import { SendCoreTransferResponse } from '../../../../types/messages/response/SendCoreTransferResponse'

// Sends Core (L1) funds from the wallet's own addresses to a Core address.
// The L1 counterpart of SendPlatformTransfer: reads the wallet's unspent outputs
// from the explorer, picks enough of them to cover amount + fee, derives the key
// of each spent address (needs the password), signs the transaction and
// broadcasts it over DAPI.
//
// Which addresses the wallet owns comes from the explorer's own gap scan of the
// account xpub, so outputs paid to addresses created by another install on the
// same seed are spendable here too.
export class SendCoreTransferHandler implements APIHandler {
  walletRepository: WalletRepository
  corePendingSpendsRepository: CorePendingSpendsRepository
  coreSpend: CoreSpendService
  sdk: DashPlatformSDK

  constructor (walletRepository: WalletRepository, corePendingSpendsRepository: CorePendingSpendsRepository, coreSpend: CoreSpendService, sdk: DashPlatformSDK) {
    this.walletRepository = walletRepository
    this.corePendingSpendsRepository = corePendingSpendsRepository
    this.coreSpend = coreSpend
    this.sdk = sdk
  }

  async handle (event: EventData): Promise<SendCoreTransferResponse> {
    const payload: SendCoreTransferPayload = event.payload
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }
    if (wallet.type !== 'seedphrase') {
      throw new Error('Core transfer is only supported for a seedphrase wallet')
    }
    if (!validateCoreAddress(payload.toAddress, wallet.network)) {
      throw new Error(`Invalid recipient Core address for ${wallet.network}`)
    }

    const account = 0
    const xpub = await this.walletRepository.getCoreAccountXpub(account)

    if (xpub == null) {
      // Written at wallet creation, or by INIT_ACCOUNT_XPUBS on unlock for a
      // wallet made before Core support. Reaching here means neither has run.
      throw new Error('Core xpub is not initialized. Call INIT_ACCOUNT_XPUBS with the wallet password after unlocking')
    }

    const prepared = await this.coreSpend.prepare({
      wallet,
      xpub,
      account,
      outputs: [{ address: payload.toAddress, amountDuffs: BigInt(payload.amountDuffs) }],
      password: payload.password,
      fromAddress: payload.fromAddress != null && payload.fromAddress.length > 0 ? payload.fromAddress : undefined
    })

    await this.corePendingSpendsRepository.remove(prepared.resolvedTxids)
    await this.coreSpend.broadcast(prepared)

    return {
      txid: prepared.txid,
      amountDuffs: prepared.amountDuffs.toString(),
      feeDuffs: prepared.feeDuffs.toString(),
      changeDuffs: prepared.changeDuffs.toString(),
      toAddress: payload.toAddress,
      changeAddress: prepared.changeAddress,
      fromAddresses: prepared.fromAddresses
    }
  }

  validatePayload (payload: SendCoreTransferPayload): string | null {
    if (typeof payload.toAddress !== 'string' || payload.toAddress.length === 0) {
      return 'Recipient address must be provided'
    }
    if (typeof payload.amountDuffs !== 'string' || !/^\d+$/.test(payload.amountDuffs) || BigInt(payload.amountDuffs) <= 0n) {
      return 'Amount must be a positive integer string of duffs'
    }
    if (typeof payload.password !== 'string' || payload.password.length === 0) {
      return 'Password must be provided'
    }
    if (payload.fromAddress != null && typeof payload.fromAddress !== 'string') {
      return 'fromAddress must be a string'
    }

    return null
  }
}
