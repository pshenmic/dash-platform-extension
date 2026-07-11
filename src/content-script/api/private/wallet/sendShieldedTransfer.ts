import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { OrchardAddressWASM } from 'pshenmic-dpp'
import { decryptMnemonic, prepareShieldedSpend } from '../../../../utils'
import { SHIELDED_SPEND_FEE_CREDITS } from '../../../../constants'
import { SendShieldedTransferPayload } from '../../../../types/messages/payloads/SendShieldedTransferPayload'
import { SendShieldedTransferResponse } from '../../../../types/messages/response/SendShieldedTransferResponse'

// Sends a private (pool -> pool) shielded transfer via a shieldedTransfer state
// transition. Syncs and witnesses the wallet's notes, builds the Orchard (Halo2)
// proof — slow, runs in the popup for now — and broadcasts. Needs the password to
// recover and spend the notes.
export class SendShieldedTransferHandler implements APIHandler {
  walletRepository: WalletRepository
  sdk: DashPlatformSDK

  constructor (walletRepository: WalletRepository, sdk: DashPlatformSDK) {
    this.walletRepository = walletRepository
    this.sdk = sdk
  }

  async handle (event: EventData): Promise<SendShieldedTransferResponse> {
    const payload: SendShieldedTransferPayload = event.payload
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }
    if (wallet.type !== 'seedphrase') {
      throw new Error('Shielded transfer is only supported for a seedphrase wallet')
    }

    const account = payload.account ?? 0
    const amountCredits = BigInt(payload.amountCredits)
    const seed = this.sdk.keyPair.mnemonicToSeed(decryptMnemonic(wallet, payload.password))

    const { spends, anchor, changeAddress, coinType } = await prepareShieldedSpend(this.sdk, seed, wallet.network, account, amountCredits + SHIELDED_SPEND_FEE_CREDITS)

    console.time('[shielded] transfer: build + prove')
    const stateTransition = await this.sdk.shielded.createStateTransition('shieldedTransfer', {
      spends,
      changeAddress,
      seed,
      coinType,
      account,
      anchor,
      recipient: OrchardAddressWASM.fromBech32m(payload.toShieldedAddress),
      transferAmount: amountCredits,
      memo: payload.memo
    })
    console.timeEnd('[shielded] transfer: build + prove')

    console.log('[shielded] broadcasting…')
    await this.sdk.stateTransitions.broadcast(stateTransition)
    await this.sdk.stateTransitions.waitForStateTransitionResult(stateTransition)

    return {
      stHash: stateTransition.hash(false),
      amountCredits: amountCredits.toString(),
      toShieldedAddress: payload.toShieldedAddress
    }
  }

  validatePayload (payload: SendShieldedTransferPayload): string | null {
    if (typeof payload.toShieldedAddress !== 'string' || payload.toShieldedAddress.length === 0) {
      return 'Recipient shielded address must be provided'
    }
    if (typeof payload.amountCredits !== 'string' || !/^\d+$/.test(payload.amountCredits) || BigInt(payload.amountCredits) <= 0n) {
      return 'Amount must be a positive integer string of credits'
    }
    if (typeof payload.password !== 'string' || payload.password.length === 0) {
      return 'Password must be provided'
    }
    if (payload.account != null && (!Number.isInteger(payload.account) || payload.account < 0)) {
      return 'Account must be a non-negative integer'
    }
    if (payload.memo != null && typeof payload.memo !== 'string') {
      return 'memo must be a string'
    }

    return null
  }
}
