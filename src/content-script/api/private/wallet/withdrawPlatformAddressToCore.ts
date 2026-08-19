import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { DashPlatformSDK } from 'dash-platform-sdk'
import {
  buildPlatformSourceCandidates,
  coreAddressToScript,
  derivePlatformAddressPrivateKey,
  selectPlatformSource,
  buildSignedAddressWithdrawal
} from '../../../../utils'
import { TRANSFER_FEE_CREDITS, WITHDRAWAL_CORE_FEE_PER_BYTE, WITHDRAWAL_POOLING } from '../../../../constants'
import { WithdrawPlatformAddressToCorePayload } from '../../../../types/messages/payloads/WithdrawPlatformAddressToCorePayload'
import { WithdrawPlatformAddressToCoreResponse } from '../../../../types/messages/response/WithdrawPlatformAddressToCoreResponse'

// Withdraws credits from a Platform address to a Core (L1) address
// via an AddressCreditWithdrawal state transition. Picks a source (explicit, or
// the largest covering amount + fee), derives its key (needs the password) and
// signs with it; the platform produces the resulting L1 transaction.
export class WithdrawPlatformAddressToCoreHandler implements APIHandler {
  walletRepository: WalletRepository
  sdk: DashPlatformSDK

  constructor (walletRepository: WalletRepository, sdk: DashPlatformSDK) {
    this.walletRepository = walletRepository
    this.sdk = sdk
  }

  async handle (event: EventData): Promise<WithdrawPlatformAddressToCoreResponse> {
    const payload: WithdrawPlatformAddressToCorePayload = event.payload
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }
    if (wallet.type !== 'seedphrase') {
      throw new Error('Platform withdrawal is only supported for a seedphrase wallet')
    }

    const account = 0
    const amountCredits = BigInt(payload.amountCredits)
    const outputScript = coreAddressToScript(payload.toCoreAddress, wallet.network)

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
    const source = selectPlatformSource(candidates, amountCredits, fromAddress)

    const privateKey = await derivePlatformAddressPrivateKey(wallet, payload.password, account, source.index, this.sdk)
    const stateTransition = buildSignedAddressWithdrawal(this.sdk, outputScript, source.platformAddress, source.nonce, amountCredits, WITHDRAWAL_CORE_FEE_PER_BYTE, WITHDRAWAL_POOLING, privateKey)

    await this.sdk.stateTransitions.broadcast(stateTransition)
    await this.sdk.stateTransitions.waitForStateTransitionResult(stateTransition)

    return {
      stHash: stateTransition.hash(false),
      amountCredits: amountCredits.toString(),
      feeCredits: TRANSFER_FEE_CREDITS.toString(),
      fromAddress: source.platformAddress,
      toCoreAddress: payload.toCoreAddress
    }
  }

  validatePayload (payload: WithdrawPlatformAddressToCorePayload): string | null {
    if (typeof payload.toCoreAddress !== 'string' || payload.toCoreAddress.length === 0) {
      return 'Recipient Core address must be provided'
    }
    if (typeof payload.amountCredits !== 'string' || !/^\d+$/.test(payload.amountCredits) || BigInt(payload.amountCredits) <= 0n) {
      return 'Amount must be a positive integer string of credits'
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
