import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { PlatformAddressWASM } from 'pshenmic-dpp'
import {
  buildPlatformSourceCandidates,
  derivePlatformAddressPrivateKey,
  selectPlatformSource,
  buildSignedPlatformTransfer
} from '../../../../utils'
import { TRANSFER_FEE_CREDITS } from '../../../../constants'
import { SendPlatformTransferPayload } from '../../../../types/messages/payloads/SendPlatformTransferPayload'
import { SendPlatformTransferResponse } from '../../../../types/messages/response/SendPlatformTransferResponse'

// Sends a Platform (L2) credit transfer between transparent platform addresses.
// Picks a source (explicit, or the largest covering amount + fee), derives its
// private key from the DIP-17 path (needs the password), signs an
// addressFundsTransfer state transition and broadcasts it.
export class SendPlatformTransferHandler implements APIHandler {
  walletRepository: WalletRepository
  sdk: DashPlatformSDK

  constructor (walletRepository: WalletRepository, sdk: DashPlatformSDK) {
    this.walletRepository = walletRepository
    this.sdk = sdk
  }

  async handle (event: EventData): Promise<SendPlatformTransferResponse> {
    const payload: SendPlatformTransferPayload = event.payload
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }
    if (wallet.type !== 'seedphrase') {
      throw new Error('Platform transfer is only supported for a seedphrase wallet')
    }

    try {
      PlatformAddressWASM.fromBech32m(payload.toAddress)
    } catch {
      throw new Error('Invalid recipient platform address')
    }

    const account = 0
    const amountCredits = BigInt(payload.amountCredits)

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

    if (payload.toAddress === source.platformAddress) {
      throw new Error('Recipient must be different from the source address')
    }

    const privateKey = await derivePlatformAddressPrivateKey(wallet, payload.password, account, source.index, this.sdk)
    const signedSt = buildSignedPlatformTransfer(this.sdk, source.platformAddress, source.nonce, payload.toAddress, amountCredits, privateKey)

    await this.sdk.stateTransitions.broadcast(signedSt)
    await this.sdk.stateTransitions.waitForStateTransitionResult(signedSt)

    return {
      stHash: signedSt.hash(false),
      amountCredits: amountCredits.toString(),
      feeCredits: TRANSFER_FEE_CREDITS.toString(),
      fromAddress: source.platformAddress,
      toAddress: payload.toAddress
    }
  }

  validatePayload (payload: SendPlatformTransferPayload): string | null {
    if (typeof payload.toAddress !== 'string' || payload.toAddress.length === 0) {
      return 'Recipient address must be provided'
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
