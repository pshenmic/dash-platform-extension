import { DashPlatformSDK } from 'dash-platform-sdk'
import { OrchardAddressWASM } from 'pshenmic-dpp'
import { EventData } from '../../../../types'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { AssetLockFundingAddressesRepository } from '../../../repository/AssetLockFundingAddressesRepository'
import { PendingAssetLocksRepository } from '../../../repository/PendingAssetLocksRepository'
import { AssetLockFundingService } from '../../../services/AssetLockFundingService'
import { AssetLockService } from '../../../services/AssetLockService'
import { ShieldedService } from '../../../services/ShieldedService'
import { RequestAssetLockFundingAddressHandler } from '../assetLocks/requestAssetLockFundingAddress'
import { ShieldFromWalletPayload } from '../../../../types/messages/payloads/ShieldFromWalletPayload'
import { ShieldFromWalletResponse } from '../../../../types/messages/response/ShieldFromWalletResponse'
import { deriveCoreAccountXpub } from '../../../../utils/coreAddresses'
import { decryptAssetLockFundingKey } from '../../../../utils/assetLockFundingKey'
import { computeShieldedDepositFee } from '../../../../utils/shieldedFee'
import { CREDITS_PER_DUFF, MIN_FEE_RELAY } from '../../../../constants'

// Shields the wallet's own Core (L1) coins straight into the Orchard pool: pay
// an asset lock funding address from the wallet's unspent outputs, lock the
// deposit, then deposit its credits into the pool with a shieldFromAssetLock
// state transition.
//
// One Platform transition rather than two: the asset lock credits never land on
// a Platform address, so nothing of this operation is visible on the transparent
// side beyond the asset lock itself. The recipient is the wallet's own shielded
// address unless the caller names another one - shielding to someone else's
// address is a deposit on their behalf, and valid.
export class ShieldFromWalletHandler implements APIHandler {
  walletRepository: WalletRepository
  assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository
  pendingAssetLocksRepository: PendingAssetLocksRepository
  assetLockFunding: AssetLockFundingService
  assetLock: AssetLockService
  requestAssetLockFundingAddress: RequestAssetLockFundingAddressHandler
  sdk: DashPlatformSDK
  shielded: ShieldedService

  constructor (
    walletRepository: WalletRepository,
    assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository,
    pendingAssetLocksRepository: PendingAssetLocksRepository,
    assetLockFunding: AssetLockFundingService,
    assetLock: AssetLockService,
    requestAssetLockFundingAddress: RequestAssetLockFundingAddressHandler,
    sdk: DashPlatformSDK,
    shielded: ShieldedService
  ) {
    this.walletRepository = walletRepository
    this.assetLockFundingAddressesRepository = assetLockFundingAddressesRepository
    this.pendingAssetLocksRepository = pendingAssetLocksRepository
    this.assetLockFunding = assetLockFunding
    this.assetLock = assetLock
    this.requestAssetLockFundingAddress = requestAssetLockFundingAddress
    this.sdk = sdk
    this.shielded = shielded
  }

  async handle (event: EventData): Promise<ShieldFromWalletResponse> {
    const payload: ShieldFromWalletPayload = event.payload
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }
    if (wallet.type !== 'seedphrase') {
      throw new Error('Shielding from the wallet is only supported for a seedphrase wallet')
    }

    const account = payload.account ?? 0
    const seed = this.shielded.deriveSeed(wallet, payload.password)

    // "Shield to myself" is the common case, so an absent recipient means the
    // wallet's own shielded address.
    const recipient = payload.toShieldedAddress != null && payload.toShieldedAddress.length > 0
      ? OrchardAddressWASM.fromBech32m(payload.toShieldedAddress)
      : this.sdk.keyPair.deriveShieldedAddress(seed, wallet.network, account)
    // Lets the wallet read back the memo of a deposit it sent to someone else.
    const senderOvk = this.sdk.keyPair.deriveShieldedOutgoingViewingKey(seed, wallet.network, account)

    const xpub = await this.walletRepository.getCoreAccountXpub(0) ??
      await deriveCoreAccountXpub(wallet, payload.password, 0, this.sdk)

    // A purpose of its own: a deposit meant for the pool is never the address an
    // unfinished identity registration is waiting on.
    const { address: fundingAddress } = await this.requestAssetLockFundingAddress.handle({
      ...event,
      payload: { purpose: 'shield' }
    })

    const funding = await this.assetLockFunding.fundFromWallet({
      wallet,
      xpub,
      fundingAddress,
      amountDuffs: BigInt(payload.amountDuffs),
      password: payload.password,
      assetLockFundingAddressesRepository: this.assetLockFundingAddressesRepository
    })

    const entry = await this.assetLockFundingAddressesRepository.getByAddress(fundingAddress)

    if (entry == null) {
      throw new Error(`Asset lock funding address ${fundingAddress} not found`)
    }

    const fundingKey = decryptAssetLockFundingKey(entry, payload.password, wallet.network)

    // The funding key owns the credit output as well, because it is what signs
    // the shield transition.
    const { assetLockTxid, lockedAmount, assetLockProof } = await this.assetLock.commit({
      wallet,
      fundingAddress,
      fundingTxid: funding.fundingTxid,
      fundingKey,
      creditOutputAddress: fundingAddress,
      purpose: 'shield',
      identityId: null,
      platformAddress: null,
      assetLockFundingAddressesRepository: this.assetLockFundingAddressesRepository,
      pendingAssetLocksRepository: this.pendingAssetLocksRepository
    })

    // The pool pays no fee from anywhere else, so the deposit carries it: the
    // note is the asset lock credits minus what the transition costs.
    const feeCredits = computeShieldedDepositFee()
    const shieldAmount = lockedAmount * CREDITS_PER_DUFF - feeCredits

    if (shieldAmount <= 0n) {
      throw new Error(
        `The deposit of ${lockedAmount.toString()} duffs leaves nothing to shield after the shield fee ` +
        `(${feeCredits.toString()} credits). Shield at least ${(feeCredits / CREDITS_PER_DUFF + MIN_FEE_RELAY + 1n).toString()} duffs`
      )
    }

    const stateTransition = await this.sdk.shielded.createStateTransition('shieldFromAssetLock', {
      recipient,
      shieldAmount,
      assetLockProof,
      privateKey: fundingKey,
      memo: payload.memo,
      dummyOutputs: 0,
      senderOvk
    })

    await this.sdk.stateTransitions.broadcast(stateTransition)
    await this.sdk.stateTransitions.waitForStateTransitionResult(stateTransition)

    await this.assetLockFundingAddressesRepository.markAsUsed(fundingAddress)
    await this.pendingAssetLocksRepository.remove(assetLockTxid)

    return {
      stHash: stateTransition.hash(false),
      shieldedAmountCredits: shieldAmount.toString(),
      shieldFeeCredits: feeCredits.toString(),
      toShieldedAddress: recipient.toBech32m(wallet.network),
      assetLockTxid,
      fundingAddress,
      fundingTxid: funding.fundingTxid,
      coreFeeDuffs: funding.feeDuffs.toString()
    }
  }

  validatePayload (payload: ShieldFromWalletPayload): string | null {
    if (typeof payload.amountDuffs !== 'string' || !/^\d+$/.test(payload.amountDuffs)) {
      return 'amountDuffs must be a positive integer string of duffs'
    }
    // Below this there is nothing left to lock, let alone to shield: the asset
    // lock pays its own fee out of the deposit, and the pool takes its own.
    if (BigInt(payload.amountDuffs) <= MIN_FEE_RELAY + computeShieldedDepositFee() / CREDITS_PER_DUFF) {
      return `amountDuffs must be greater than the asset lock fee plus the shield fee (${(MIN_FEE_RELAY + computeShieldedDepositFee() / CREDITS_PER_DUFF).toString()} duffs)`
    }
    if (typeof payload.password !== 'string' || payload.password.length === 0) {
      return 'password must be provided'
    }
    if (payload.toShieldedAddress != null && typeof payload.toShieldedAddress !== 'string') {
      return 'toShieldedAddress must be a string'
    }

    const memoError = this.shielded.validateMemo(payload.memo)

    if (memoError != null) {
      return memoError
    }

    return this.shielded.validateAccount(payload.account)
  }
}
