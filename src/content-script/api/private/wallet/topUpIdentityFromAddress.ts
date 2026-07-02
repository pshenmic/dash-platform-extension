import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { DashPlatformSDK } from 'dash-platform-sdk'
import {
  derivePlatformAddressesFromXpub,
  derivePlatformAddressPrivateKey,
  selectPlatformSource,
  buildSignedIdentityTopUpFromAddress,
  validateIdentifier,
  PlatformSourceCandidate
} from '../../../../utils'
import { TRANSFER_FEE_CREDITS } from '../../../../constants'
import { TopUpIdentityFromAddressPayload } from '../../../../types/messages/payloads/TopUpIdentityFromAddressPayload'
import { TopUpIdentityFromAddressResponse } from '../../../../types/messages/response/TopUpIdentityFromAddressResponse'

// Tops up an identity's credit balance from a transparent platform address via an
// IdentityTopUpFromAddresses state transition. Picks a source address (explicit,
// or the largest covering amount + fee), derives its key (needs the password) and
// signs with it — the target identity does not sign, so any identity can be
// topped up (unlike the L1 asset-lock top-up which only funds your own identity).
export class TopUpIdentityFromAddressHandler implements APIHandler {
  walletRepository: WalletRepository
  sdk: DashPlatformSDK

  constructor (walletRepository: WalletRepository, sdk: DashPlatformSDK) {
    this.walletRepository = walletRepository
    this.sdk = sdk
  }

  async handle (event: EventData): Promise<TopUpIdentityFromAddressResponse> {
    const payload: TopUpIdentityFromAddressPayload = event.payload
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }
    if (wallet.type !== 'seedphrase') {
      throw new Error('Platform top-up is only supported for a seedphrase wallet')
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

    const created = derivePlatformAddressesFromXpub(xpub, wallet.network, account, count)
    const infos = await this.sdk.platformAddresses.getAddressesInfos(created.map(entry => entry.address))
    const infoByAddress = new Map(infos.map(info => [
      info.address.toBech32m(wallet.network),
      { balance: info.balance, nonce: info.nonce }
    ]))

    const candidates: PlatformSourceCandidate[] = created.map(entry => {
      const info = infoByAddress.get(entry.address)

      return {
        platformAddress: entry.address,
        derivationPath: entry.derivationPath,
        index: entry.index,
        balanceCredits: info?.balance ?? 0n,
        nonce: info?.nonce ?? 0
      }
    })

    const fromAddress = payload.fromAddress != null && payload.fromAddress.length > 0 ? payload.fromAddress : undefined
    const source = selectPlatformSource(candidates, amountCredits, fromAddress)

    const privateKey = await derivePlatformAddressPrivateKey(wallet, payload.password, account, source.index, this.sdk)
    const stateTransition = buildSignedIdentityTopUpFromAddress(payload.identityId, source.platformAddress, source.nonce, amountCredits, privateKey)

    await this.sdk.stateTransitions.broadcast(stateTransition)
    await this.sdk.stateTransitions.waitForStateTransitionResult(stateTransition)

    return {
      stHash: stateTransition.hash(false),
      amountCredits: amountCredits.toString(),
      feeCredits: TRANSFER_FEE_CREDITS.toString(),
      fromAddress: source.platformAddress,
      identityId: payload.identityId
    }
  }

  validatePayload (payload: TopUpIdentityFromAddressPayload): string | null {
    if (!validateIdentifier(payload.identityId)) {
      return 'identityId must be a valid identifier'
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
