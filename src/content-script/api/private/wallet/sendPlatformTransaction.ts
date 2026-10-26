import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { PlatformAddressWASM } from 'pshenmic-dpp'
import {
  buildPlatformSourceCandidates,
  derivePlatformAddressPrivateKey,
  selectPlatformSource,
  buildSignedPlatformTransferMulti,
  platformTransferFeeCredits
} from '../../../../utils'
import { MIN_OUTPUT_CREDITS } from '../../../../constants'
import { SendPlatformTransactionPayload } from '../../../../types/messages/payloads/SendPlatformTransactionPayload'
import { SendPlatformTransactionResponse } from '../../../../types/messages/response/SendPlatformTransactionResponse'

// Pays several Platform addresses from one of the wallet's own, with a single
// addressFundsTransfer transition. The general form of SEND_PLATFORM_TRANSFER,
// which stays as the one-recipient shorthand.
//
// The fee grows with every recipient, so it is taken from dpp's fee model rather
// than reserved flat: the source has to cover the total plus that fee.
export class SendPlatformTransactionHandler implements APIHandler {
  walletRepository: WalletRepository
  sdk: DashPlatformSDK

  constructor (walletRepository: WalletRepository, sdk: DashPlatformSDK) {
    this.walletRepository = walletRepository
    this.sdk = sdk
  }

  async handle (event: EventData): Promise<SendPlatformTransactionResponse> {
    const payload: SendPlatformTransactionPayload = event.payload
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }
    if (wallet.type !== 'seedphrase') {
      throw new Error('Platform transfer is only supported for a seedphrase wallet')
    }

    const recipients = payload.outputs.map(output => {
      try {
        PlatformAddressWASM.fromBech32m(output.address)
      } catch {
        throw new Error(`Invalid recipient platform address: ${output.address}`)
      }

      return { address: output.address, amountCredits: BigInt(output.amountCredits) }
    })

    const account = 0
    const total = recipients.reduce((sum, recipient) => sum + recipient.amountCredits, 0n)
    const feeCredits = platformTransferFeeCredits(recipients.length)

    const xpub = await this.walletRepository.getPlatformAccountXpub(account)
    if (xpub == null) {
      throw new Error('Platform xpub is not initialized')
    }

    const count = await this.walletRepository.getPlatformAddressCount(account)
    if (count === 0) {
      throw new Error('No Platform addresses have been created yet')
    }

    const candidates = await buildPlatformSourceCandidates(this.sdk, xpub, wallet.network, account, count)
    const fromAddress = payload.fromAddress != null && payload.fromAddress.length > 0 ? payload.fromAddress : undefined
    const source = selectPlatformSource(candidates, total, fromAddress, feeCredits)

    // Paying the source itself would spend the fee to move credits nowhere.
    const toItself = recipients.find(recipient => recipient.address === source.platformAddress)

    if (toItself != null) {
      throw new Error('Recipient must be different from the source address')
    }

    const privateKey = await derivePlatformAddressPrivateKey(wallet, payload.password, account, source.index, this.sdk)
    const signedSt = buildSignedPlatformTransferMulti(this.sdk, source.platformAddress, source.nonce, recipients, privateKey)

    await this.sdk.stateTransitions.broadcast(signedSt)
    await this.sdk.stateTransitions.waitForStateTransitionResult(signedSt)

    return {
      stHash: signedSt.hash(false),
      amountCredits: total.toString(),
      feeCredits: feeCredits.toString(),
      fromAddress: source.platformAddress,
      outputs: recipients.map(recipient => ({
        address: recipient.address,
        amountCredits: recipient.amountCredits.toString()
      }))
    }
  }

  validatePayload (payload: SendPlatformTransactionPayload): string | null {
    if (!Array.isArray(payload?.outputs) || payload.outputs.length === 0) {
      return 'outputs must be a non-empty array'
    }
    if (payload.outputs.length > MAX_PLATFORM_OUTPUTS) {
      return `A transition pays at most ${MAX_PLATFORM_OUTPUTS} recipients, ${payload.outputs.length} given`
    }

    const addresses = new Set<string>()

    for (const output of payload.outputs) {
      if (typeof output?.address !== 'string' || output.address.length === 0) {
        return 'Every output must name an address'
      }
      if (addresses.has(output.address)) {
        return `Every output must name a different address, ${output.address} is repeated`
      }
      if (typeof output?.amountCredits !== 'string' || !/^\d+$/.test(output.amountCredits)) {
        return 'Every output amount must be an integer string of credits'
      }
      if (BigInt(output.amountCredits) < MIN_OUTPUT_CREDITS) {
        return `Every output must be at least ${MIN_OUTPUT_CREDITS.toString()} credits`
      }

      addresses.add(output.address)
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
