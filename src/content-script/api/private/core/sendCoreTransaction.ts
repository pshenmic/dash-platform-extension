import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { CoreSpendService } from '../../../services/CoreSpendService'
import { EventData } from '../../../../types/EventData'
import { SendCoreTransactionPayload } from '../../../../types/messages/payloads/SendCoreTransactionPayload'
import { SendCoreTransactionResponse } from '../../../../types/messages/response/SendCoreTransactionResponse'
import { validateCoreOutputsPayload } from './estimateCoreTransfer'
import { validateCoreAddress } from '../../../../utils'

// Sends one Core (L1) transaction paying several recipients, optionally out of
// outputs the caller picked and with change to an address it names. The general
// form of SEND_CORE_TRANSFER, which stays as the one-recipient shorthand.
export class SendCoreTransactionHandler implements APIHandler {
  walletRepository: WalletRepository
  coreSpend: CoreSpendService

  constructor (walletRepository: WalletRepository, coreSpend: CoreSpendService) {
    this.walletRepository = walletRepository
    this.coreSpend = coreSpend
  }

  async handle (event: EventData): Promise<SendCoreTransactionResponse> {
    const payload: SendCoreTransactionPayload = event.payload
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }
    if (wallet.type !== 'seedphrase') {
      throw new Error('Core transfer is only supported for a seedphrase wallet')
    }

    for (const output of payload.outputs) {
      if (!validateCoreAddress(output.address, wallet.network)) {
        throw new Error(`Invalid recipient Core address for ${wallet.network}: ${output.address}`)
      }
    }

    const account = 0
    const xpub = await this.walletRepository.getCoreAccountXpub(account)

    if (xpub == null) {
      throw new Error('Core xpub is not initialized. Call INIT_ACCOUNT_XPUBS with the wallet password after unlocking')
    }

    const prepared = await this.coreSpend.prepare({
      wallet,
      xpub,
      account,
      outputs: payload.outputs.map(output => ({ address: output.address, amountDuffs: BigInt(output.amountDuffs) })),
      password: payload.password,
      fromAddress: payload.fromAddress != null && payload.fromAddress.length > 0 ? payload.fromAddress : undefined,
      inputs: payload.inputs,
      changeAddress: payload.changeAddress,
      sendMax: payload.sendMax
    })

    await this.coreSpend.broadcast(prepared)

    return {
      txid: prepared.txid,
      amountDuffs: prepared.amountDuffs.toString(),
      feeDuffs: prepared.feeDuffs.toString(),
      changeDuffs: prepared.changeDuffs.toString(),
      changeAddress: prepared.changeAddress,
      outputs: prepared.outputs.map(output => ({ address: output.address, amountDuffs: output.amountDuffs.toString() })),
      fromAddresses: prepared.fromAddresses
    }
  }

  validatePayload (payload: SendCoreTransactionPayload): string | null {
    if (typeof payload?.password !== 'string' || payload.password.length === 0) {
      return 'Password must be provided'
    }

    return validateCoreOutputsPayload(payload)
  }
}
