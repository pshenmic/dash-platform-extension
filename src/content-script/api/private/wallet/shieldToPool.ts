import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { InputAddressWASM, AddressFundsFeeStrategyStepWASM } from 'pshenmic-dpp'
import { buildPlatformSourceCandidates, decryptMnemonic, selectPlatformSource } from '../../../../utils'
import { ShieldToPoolPayload } from '../../../../types/messages/payloads/ShieldToPoolPayload'
import { ShieldToPoolResponse } from '../../../../types/messages/response/ShieldToPoolResponse'

// Shields credits from a Platform address into the wallet's own
// Orchard pool via a shield state transition. Picks a source (explicit, or the
// largest covering amount + fee), signs the input with its key, and builds the
// Orchard (Halo2) proof — slow, runs in the popup for now — targeting the wallet's
// own shielded address. Needs the password.
export class ShieldToPoolHandler implements APIHandler {
  walletRepository: WalletRepository
  sdk: DashPlatformSDK

  constructor (walletRepository: WalletRepository, sdk: DashPlatformSDK) {
    this.walletRepository = walletRepository
    this.sdk = sdk
  }

  async handle (event: EventData): Promise<ShieldToPoolResponse> {
    const payload: ShieldToPoolPayload = event.payload
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }
    if (wallet.type !== 'seedphrase') {
      throw new Error('Shielding is only supported for a seedphrase wallet')
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

    const seed = this.sdk.keyPair.mnemonicToSeed(decryptMnemonic(wallet, payload.password))
    const privateKey = await this.sdk.keyPair.derivePlatformAddressPrivateKey(seed, wallet.network, account, source.index)
    const recipient = this.sdk.keyPair.deriveShieldedAddress(seed, wallet.network, account)
    const senderOvk = this.sdk.keyPair.deriveShieldedOutgoingViewingKey(seed, wallet.network, account)

    const inputs = [new InputAddressWASM(source.platformAddress, source.nonce + 1, source.balanceCredits)]
    const feeStrategy = [AddressFundsFeeStrategyStepWASM.DeductFromInput(0)]

    console.time('[shielded] shield: build + prove')
    const stateTransition = await this.sdk.shielded.createStateTransition('shield', {
      recipient,
      shieldAmount: amountCredits,
      inputs,
      privateKeys: [privateKey],
      feeStrategy,
      userFeeIncrease: 0,
      senderOvk,
      memo: payload.memo
    })
    console.timeEnd('[shielded] shield: build + prove')

    console.log('[shielded] broadcasting…')
    await this.sdk.stateTransitions.broadcast(stateTransition)
    await this.sdk.stateTransitions.waitForStateTransitionResult(stateTransition)

    return {
      stHash: stateTransition.hash(false),
      amountCredits: amountCredits.toString(),
      fromAddress: source.platformAddress
    }
  }

  validatePayload (payload: ShieldToPoolPayload): string | null {
    if (typeof payload.amountCredits !== 'string' || !/^\d+$/.test(payload.amountCredits) || BigInt(payload.amountCredits) <= 0n) {
      return 'Amount must be a positive integer string of credits'
    }
    if (typeof payload.password !== 'string' || payload.password.length === 0) {
      return 'Password must be provided'
    }
    if (payload.fromAddress != null && typeof payload.fromAddress !== 'string') {
      return 'fromAddress must be a string'
    }
    if (payload.memo != null && typeof payload.memo !== 'string') {
      return 'memo must be a string'
    }

    return null
  }
}
