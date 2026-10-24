import { Wallet } from '../../types/Wallet'
import { NetworkType } from '../../types/PlatformExplorer'
import { AssetLockFundingAddressesRepository } from '../repository/AssetLockFundingAddressesRepository'
import { CoreExplorerService } from './CoreExplorerService'
import { CoreSpendService } from './CoreSpendService'
import { bytesToHex } from '../../utils'
import { findConflictingSpend } from '../../utils/conflictingSpend'

export interface FundAssetLockAddressParams {
  wallet: Wallet
  xpub: string
  fundingAddress: string
  amountDuffs: bigint
  password: string
  account?: number
  // Scoped to the (network, wallet) the operation runs against by its caller.
  assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository
}

export interface FundedAssetLockAddress {
  fundingTxid: string
  // false when the address already held a deposit and nothing was paid now.
  paid: boolean
  feeDuffs: bigint
  changeDuffs: bigint
}

const CONTINUED = { paid: false, feeDuffs: 0n, changeDuffs: 0n }

/**
 * Puts a deposit on an asset lock funding address out of the wallet's own coins.
 *
 * The step the popup used to drive between "give me a funding address" and "turn
 * that deposit into credits". Doing it here is what makes the whole chain
 * repeatable: the payment is written down before it is broadcast, so a second
 * attempt continues from the deposit that is already on L1 instead of paying the
 * address again.
 */
export class AssetLockFundingService {
  coreExplorer: CoreExplorerService
  coreSpend: CoreSpendService

  constructor (coreExplorer: CoreExplorerService, coreSpend: CoreSpendService) {
    this.coreExplorer = coreExplorer
    this.coreSpend = coreSpend
  }

  async fundFromWallet (params: FundAssetLockAddressParams): Promise<FundedAssetLockAddress> {
    const { wallet, xpub, fundingAddress, amountDuffs, password, assetLockFundingAddressesRepository } = params
    const account = params.account ?? 0

    const entry = await assetLockFundingAddressesRepository.getByAddress(fundingAddress)

    if (entry?.fundingTxid != null) {
      return await this.continueRecordedPayment(
        entry.address, entry.fundingTxid, wallet.network as NetworkType, entry.assetLockTxid, entry.fundingTxHex
      )
    }

    if (entry?.assetLockTxid != null) {
      // The asset lock was built and broadcast, which means the deposit is spent
      // and its transaction is the only thing that could rebuild the same lock.
      // Nothing recorded it, so paying again would commit a second deposit the
      // asset lock cannot include.
      throw new Error(
        `Asset lock funding address ${fundingAddress} already has an asset lock on L1 (${entry.assetLockTxid}), ` +
        'but the transaction that funded it was not recorded. Finish that operation with its original funding transaction id'
      )
    }

    // Nothing recorded locally still leaves a deposit possible: one the user sent
    // from elsewhere, or one paid before this was written down.
    const deposits = await this.coreExplorer.getAddressUtxos(fundingAddress, wallet.network as NetworkType)
    const depositTxids = [...new Set(deposits.map(deposit => deposit.txid))]

    if (depositTxids.length > 1) {
      throw new Error(
        `Asset lock funding address ${fundingAddress} holds deposits from several transactions ` +
        `(${depositTxids.join(', ')}), and an asset lock is built from one of them. ` +
        'Spend them from the wallet first, or finish the operation with one transaction id'
      )
    }

    if (depositTxids.length === 1) {
      if (entry != null) {
        await assetLockFundingAddressesRepository.markAsFunded(fundingAddress, depositTxids[0])
      }

      return { fundingTxid: depositTxids[0], ...CONTINUED }
    }

    const prepared = await this.coreSpend.prepare({
      wallet, xpub, account, outputs: [{ address: fundingAddress, amountDuffs }], password
    })

    if (entry != null) {
      // Written while the payment is still only in memory: from the broadcast on,
      // the coins are at the funding address, and a repeat has to continue from
      // this transaction rather than pay the address a second time.
      await assetLockFundingAddressesRepository.markAsFunded(
        fundingAddress, prepared.txid, amountDuffs.toString(), bytesToHex(prepared.transaction.bytes())
      )
    }

    await this.coreSpend.broadcast(prepared)

    return {
      fundingTxid: prepared.txid,
      paid: true,
      feeDuffs: prepared.feeDuffs,
      changeDuffs: prepared.changeDuffs
    }
  }

  /**
   * Continues the payment an earlier attempt recorded.
   *
   * The payment is written down before it is broadcast, so an attempt that died
   * in between leaves a record of a transaction the network may never have seen.
   * Returning the txid regardless is what left such an operation waiting forever
   * for a transaction nobody has.
   */
  async continueRecordedPayment (
    fundingAddress: string,
    fundingTxid: string,
    network: NetworkType,
    assetLockTxid?: string | null,
    fundingTxHex?: string
  ): Promise<FundedAssetLockAddress> {
    if (assetLockTxid != null) {
      // The deposit is already spent by an asset lock, so the payment is on L1
      // whatever any node currently answers.
      return { fundingTxid, ...CONTINUED }
    }

    if (fundingTxHex != null) {
      // Idempotent: the same transaction either enters the network now or is
      // reported as one it already has.
      try {
        await this.coreSpend.rebroadcast(fundingTxid, fundingTxHex)
      } catch (e) {
        // Every node will reject it the same way for as long as it exists, so
        // say what happened to it rather than leaving the caller to retry into
        // the same wall.
        const conflict = await findConflictingSpend(this.coreExplorer, fundingTxid, fundingTxHex, network)

        if (conflict == null) {
          throw e
        }

        throw new Error(
          `Funding payment ${fundingTxid} for ${fundingAddress} can never confirm: ` +
          `transaction ${conflict} has spent one of its inputs. ` +
          'Discard it with DISCARD_ASSET_LOCK_FUNDING to pay the address again'
        )
      }

      return { fundingTxid, ...CONTINUED }
    }

    // Recorded before the bytes were kept, so there is nothing to send again.
    // Nothing here may pay the address a second time: the recorded transaction
    // can be sitting in a mempool this node has not seen, and a second payment
    // would put two deposits on an address an asset lock spends one of. Say
    // what is stuck instead, and leave discarding it to a caller who asked for
    // it knowingly.
    if (!await this.coreSpend.isBroadcast(fundingTxid)) {
      throw new Error(
        `Funding payment ${fundingTxid} for ${fundingAddress} was recorded before the signed transaction was kept, ` +
        'and no node has it, so it cannot be sent again. It may still be propagating; if it never arrives, ' +
        'discard it with DISCARD_ASSET_LOCK_FUNDING to pay the address once more'
      )
    }

    return { fundingTxid, ...CONTINUED }
  }
}
