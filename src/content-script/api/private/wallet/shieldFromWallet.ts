import { DashPlatformSDK } from 'dash-platform-sdk'
import { EventData } from '../../../../types'
import { APIHandler } from '../../APIHandler'
import { WalletRepository } from '../../../repository/WalletRepository'
import { AssetLockFundingAddressesRepository } from '../../../repository/AssetLockFundingAddressesRepository'
import { PendingAssetLocksRepository } from '../../../repository/PendingAssetLocksRepository'
import { AssetLockFundingService } from '../../../services/AssetLockFundingService'
import { ShieldedService } from '../../../services/ShieldedService'
import { RequestAssetLockFundingAddressHandler } from '../assetLocks/requestAssetLockFundingAddress'
import { ShieldFromCoreHandler } from './shieldFromCore'
import { ShieldFromWalletPayload } from '../../../../types/messages/payloads/ShieldFromWalletPayload'
import { ShieldFromWalletResponse } from '../../../../types/messages/response/ShieldFromWalletResponse'
import { ShieldFromCoreResponse } from '../../../../types/messages/response/ShieldFromCoreResponse'
import { deriveCoreAccountXpub } from '../../../../utils/coreAddresses'
import { findUnfinishedAssetLock } from '../../../../utils/pendingAssetLocks'
import { computeShieldedDepositFee } from '../../../../utils/shieldedFee'
import { CREDITS_PER_DUFF, MIN_FEE_RELAY } from '../../../../constants'

// Shields the wallet's own Core (L1) coins: pays an asset lock funding address
// out of the wallet's unspent outputs, then hands that deposit to
// SHIELD_FROM_CORE, which locks it and deposits its credits into the pool.
//
// Splitting it there is what makes a shield resumable. Calling this method
// again is the way back in at either point: it finds the operation left
// unfinished for the same pool and continues it, whether the money is still on
// the funding address or already locked. SHIELD_FROM_CORE is for a caller that
// would rather drive that last step itself.
export class ShieldFromWalletHandler implements APIHandler {
  walletRepository: WalletRepository
  assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository
  pendingAssetLocksRepository: PendingAssetLocksRepository
  assetLockFunding: AssetLockFundingService
  requestAssetLockFundingAddress: RequestAssetLockFundingAddressHandler
  shieldFromCore: ShieldFromCoreHandler
  sdk: DashPlatformSDK
  shielded: ShieldedService

  constructor (
    walletRepository: WalletRepository,
    assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository,
    pendingAssetLocksRepository: PendingAssetLocksRepository,
    assetLockFunding: AssetLockFundingService,
    requestAssetLockFundingAddress: RequestAssetLockFundingAddressHandler,
    shieldFromCore: ShieldFromCoreHandler,
    sdk: DashPlatformSDK,
    shielded: ShieldedService
  ) {
    this.walletRepository = walletRepository
    this.assetLockFundingAddressesRepository = assetLockFundingAddressesRepository
    this.pendingAssetLocksRepository = pendingAssetLocksRepository
    this.assetLockFunding = assetLockFunding
    this.requestAssetLockFundingAddress = requestAssetLockFundingAddress
    this.shieldFromCore = shieldFromCore
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

    // The pool a shield deposits into: the address the caller named, or the
    // wallet's own, which is recorded as no recipient at all.
    const recipient = payload.toShieldedAddress != null && payload.toShieldedAddress.length > 0
      ? payload.toShieldedAddress
      : null

    // An earlier attempt may have got as far as putting the asset lock on L1,
    // where a fresh start would pay a second time and leave those credits with
    // nothing to spend them on. Finish that one instead.
    const unfinished = findUnfinishedAssetLock(
      await this.pendingAssetLocksRepository.getAll(), 'shield', recipient
    )

    if (unfinished != null) {
      const resumed = await this.shield(unfinished.fundingAddress, unfinished.fundingTxid, payload, event)

      return { ...resumed, fundingAddress: unfinished.fundingAddress, fundingTxid: unfinished.fundingTxid, coreFeeDuffs: '0', resumed: true }
    }

    const xpub = await this.walletRepository.getCoreAccountXpub(0) ??
      await deriveCoreAccountXpub(wallet, payload.password, 0, this.sdk)

    // A purpose of its own, and reserved for this recipient: a deposit meant for
    // the pool is never the address an unfinished registration is waiting on,
    // and never one paid for a different pool - that money is not this call's to
    // spend. 'own' stands for the wallet's own pool, whose address is derived
    // from the seed rather than written down.
    const { address: fundingAddress } = await this.requestAssetLockFundingAddress.handle({
      ...event,
      payload: { purpose: 'shield', recipient: recipient ?? 'own' }
    })

    const funding = await this.assetLockFunding.fundFromWallet({
      wallet,
      xpub,
      fundingAddress,
      amountDuffs: BigInt(payload.amountDuffs),
      password: payload.password,
      assetLockFundingAddressesRepository: this.assetLockFundingAddressesRepository
    })

    const shielded = await this.shield(fundingAddress, funding.fundingTxid, payload, event)

    return {
      ...shielded,
      fundingAddress,
      fundingTxid: funding.fundingTxid,
      coreFeeDuffs: funding.feeDuffs.toString(),
      // Nothing was paid when the funding address already held the deposit of
      // an earlier attempt, so this call continued that one.
      resumed: !funding.paid
    }
  }

  // The Platform half: lock this deposit and put its credits into the pool.
  private async shield (fundingAddress: string, fundingTxid: string, payload: ShieldFromWalletPayload, event: EventData): Promise<ShieldFromCoreResponse> {
    return await this.shieldFromCore.handle({
      ...event,
      payload: {
        assetLockFundingAddress: fundingAddress,
        assetLockFundingTxid: fundingTxid,
        password: payload.password,
        toShieldedAddress: payload.toShieldedAddress,
        memo: payload.memo,
        account: payload.account
      }
    })
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
