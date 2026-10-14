import { Wallet } from '../../types/Wallet'
import { NetworkType } from '../../types/PlatformExplorer'
import { AssetLockFundingAddressesRepository } from '../repository/AssetLockFundingAddressesRepository'
import { CorePendingSpendsRepository } from '../repository/CorePendingSpendsRepository'
import { CoreExplorerService } from './CoreExplorerService'
import { CoreSpendService } from './CoreSpendService'

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
  corePendingSpendsRepository: CorePendingSpendsRepository

  constructor (coreExplorer: CoreExplorerService, coreSpend: CoreSpendService, corePendingSpendsRepository: CorePendingSpendsRepository) {
    this.coreExplorer = coreExplorer
    this.coreSpend = coreSpend
    this.corePendingSpendsRepository = corePendingSpendsRepository
  }

  async fundFromWallet (params: FundAssetLockAddressParams): Promise<FundedAssetLockAddress> {
    const { wallet, xpub, fundingAddress, amountDuffs, password, assetLockFundingAddressesRepository } = params
    const account = params.account ?? 0

    const entry = await assetLockFundingAddressesRepository.getByAddress(fundingAddress)

    if (entry?.fundingTxid != null) {
      return { fundingTxid: entry.fundingTxid, paid: false, feeDuffs: 0n, changeDuffs: 0n }
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

      return { fundingTxid: depositTxids[0], paid: false, feeDuffs: 0n, changeDuffs: 0n }
    }

    const prepared = await this.coreSpend.prepare({
      wallet, xpub, account, outputs: [{ address: fundingAddress, amountDuffs }], password
    })

    await this.corePendingSpendsRepository.remove(prepared.resolvedTxids)

    if (entry != null) {
      // Written while the payment is still only in memory: from the broadcast on,
      // the coins are at the funding address, and a repeat has to continue from
      // this transaction rather than pay the address a second time.
      await assetLockFundingAddressesRepository.markAsFunded(fundingAddress, prepared.txid)
    }

    await this.coreSpend.broadcast(prepared)

    return {
      fundingTxid: prepared.txid,
      paid: true,
      feeDuffs: prepared.feeDuffs,
      changeDuffs: prepared.changeDuffs
    }
  }
}
