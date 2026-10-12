import { DashPlatformSDK } from 'dash-platform-sdk'
import { OrchardAddressWASM } from 'pshenmic-dpp'
import { EventData } from '../../../../types'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { AssetLockFundingAddressesRepository } from '../../../repository/AssetLockFundingAddressesRepository'
import { PendingAssetLocksRepository } from '../../../repository/PendingAssetLocksRepository'
import { AssetLockService } from '../../../services/AssetLockService'
import { ShieldedService } from '../../../services/ShieldedService'
import { ShieldFromCorePayload } from '../../../../types/messages/payloads/ShieldFromCorePayload'
import { ShieldFromCoreResponse } from '../../../../types/messages/response/ShieldFromCoreResponse'
import { decryptAssetLockFundingKey } from '../../../../utils/assetLockFundingKey'
import { computeShieldedDepositFee } from '../../../../utils/shieldedFee'
import { CREDITS_PER_DUFF, MIN_FEE_RELAY, TXID_HEX_LENGTH } from '../../../../constants'

// Turns a deposit on an asset lock funding address into a shielded note: locks
// the deposit and deposits its credits into the pool with a shieldFromAssetLock
// state transition.
//
// The Core to Platform half of a shield, and the method to call again when one
// stopped after its asset lock reached L1: the asset lock is rebuilt from the
// same deposit, recognised rather than broadcast twice, and the pool side is
// retried. The address and the transaction to pass come from
// LIST_PENDING_ASSET_LOCKS, where such an operation is listed with
// `purpose: 'shield'`.
export class ShieldFromCoreHandler implements APIHandler {
  walletRepository: WalletRepository
  assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository
  pendingAssetLocksRepository: PendingAssetLocksRepository
  assetLock: AssetLockService
  sdk: DashPlatformSDK
  shielded: ShieldedService

  constructor (
    walletRepository: WalletRepository,
    assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository,
    pendingAssetLocksRepository: PendingAssetLocksRepository,
    assetLock: AssetLockService,
    sdk: DashPlatformSDK,
    shielded: ShieldedService
  ) {
    this.walletRepository = walletRepository
    this.assetLockFundingAddressesRepository = assetLockFundingAddressesRepository
    this.pendingAssetLocksRepository = pendingAssetLocksRepository
    this.assetLock = assetLock
    this.sdk = sdk
    this.shielded = shielded
  }

  async handle (event: EventData): Promise<ShieldFromCoreResponse> {
    const payload: ShieldFromCorePayload = event.payload
    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('No wallet is chosen')
    }
    if (wallet.type !== 'seedphrase') {
      throw new Error('Shielding is only supported for a seedphrase wallet')
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

    const entry = await this.assetLockFundingAddressesRepository.getByAddress(payload.assetLockFundingAddress)

    if (entry == null) {
      throw new Error(`Asset lock funding address ${payload.assetLockFundingAddress} not found`)
    }
    if (entry.used) {
      throw new Error(`Asset lock funding address ${payload.assetLockFundingAddress} has already been used`)
    }

    const fundingKey = decryptAssetLockFundingKey(entry, payload.password, wallet.network)

    // The funding key owns the credit output as well, because it is what signs
    // the shield transition.
    const { assetLockTxid, lockedAmount, assetLockProof } = await this.assetLock.commit({
      wallet,
      fundingAddress: payload.assetLockFundingAddress,
      fundingTxid: payload.assetLockFundingTxid,
      fundingKey,
      creditOutputAddress: payload.assetLockFundingAddress,
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

    await this.assetLockFundingAddressesRepository.markAsUsed(payload.assetLockFundingAddress)
    await this.pendingAssetLocksRepository.remove(assetLockTxid)

    return {
      stHash: stateTransition.hash(false),
      shieldedAmountCredits: shieldAmount.toString(),
      shieldFeeCredits: feeCredits.toString(),
      toShieldedAddress: recipient.toBech32m(wallet.network),
      assetLockTxid
    }
  }

  validatePayload (payload: ShieldFromCorePayload): string | null {
    if (typeof payload.assetLockFundingAddress !== 'string' || payload.assetLockFundingAddress.length === 0) {
      return 'assetLockFundingAddress must be provided'
    }
    if (typeof payload.assetLockFundingTxid !== 'string' || payload.assetLockFundingTxid.length !== TXID_HEX_LENGTH) {
      return `assetLockFundingTxid must be a ${TXID_HEX_LENGTH}-character hex string`
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
