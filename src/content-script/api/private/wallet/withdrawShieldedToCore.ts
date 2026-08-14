import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { coreAddressToScript, decryptMnemonic, prepareShieldedSpend } from '../../../../utils'
import { SHIELDED_SPEND_FEE_CREDITS, WITHDRAWAL_CORE_FEE_PER_BYTE, WITHDRAWAL_POOLING } from '../../../../constants'
import { WithdrawShieldedToCorePayload } from '../../../../types/messages/payloads/WithdrawShieldedToCorePayload'
import { WithdrawShieldedToCoreResponse } from '../../../../types/messages/response/WithdrawShieldedToCoreResponse'

// Withdraws credits from the Orchard pool directly to a Core (L1) address via a
// shieldedWithdrawal state transition. Output privacy is lost on L1. Syncs and
// witnesses the wallet's notes, builds the Orchard (Halo2) proof — slow, runs in
// the popup for now — and broadcasts. Needs the password to spend the notes.
export class WithdrawShieldedToCoreHandler implements APIHandler {
  walletRepository: WalletRepository
  sdk: DashPlatformSDK

  constructor (walletRepository: WalletRepository, sdk: DashPlatformSDK) {
    this.walletRepository = walletRepository
    this.sdk = sdk
  }

  async handle (event: EventData): Promise<WithdrawShieldedToCoreResponse> {
    const payload: WithdrawShieldedToCorePayload = event.payload
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }
    if (wallet.type !== 'seedphrase') {
      throw new Error('Shielded withdrawal is only supported for a seedphrase wallet')
    }

    const account = payload.account ?? 0
    const amountCredits = BigInt(payload.amountCredits)
    const outputScript = coreAddressToScript(payload.toCoreAddress, wallet.network)
    const seed = this.sdk.keyPair.mnemonicToSeed(decryptMnemonic(wallet, payload.password))

    const { spends, anchor, changeAddress, coinType } = await prepareShieldedSpend(this.sdk, seed, wallet.network, account, amountCredits + SHIELDED_SPEND_FEE_CREDITS)

    console.time('[shielded] withdrawal: build + prove')
    const stateTransition = await this.sdk.shielded.createStateTransition('shieldedWithdrawal', {
      spends,
      changeAddress,
      seed,
      coinType,
      account,
      anchor,
      withdrawalAmount: amountCredits,
      outputScript,
      coreFeePerByte: WITHDRAWAL_CORE_FEE_PER_BYTE,
      pooling: WITHDRAWAL_POOLING,
      memo: payload.memo
    })
    console.timeEnd('[shielded] withdrawal: build + prove')

    console.log('[shielded] broadcasting…')
    await this.sdk.stateTransitions.broadcast(stateTransition)
    await this.sdk.stateTransitions.waitForStateTransitionResult(stateTransition)

    return {
      stHash: stateTransition.hash(false),
      amountCredits: amountCredits.toString(),
      toCoreAddress: payload.toCoreAddress
    }
  }

  validatePayload (payload: WithdrawShieldedToCorePayload): string | null {
    if (typeof payload.toCoreAddress !== 'string' || payload.toCoreAddress.length === 0) {
      return 'Recipient Core address must be provided'
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
