import { DashCoreSDK } from 'dash-core-sdk'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { PrivateKeyWASM } from 'dash-platform-sdk/types'
import { AssetLockProofWASM, OutPointWASM } from 'pshenmic-dpp'
import { Wallet } from '../../types/Wallet'
import { AssetLockFundingPurpose } from '../storage/storageSchema'
import { AssetLockFundingAddressesRepository } from '../repository/AssetLockFundingAddressesRepository'
import { PendingAssetLocksRepository } from '../repository/PendingAssetLocksRepository'
import { buildAssetLockFromFundingTx } from '../../utils/buildAssetLockFromFundingTx'
import { waitForAssetLockProof } from '../../utils/waitForAssetLockProof'
import { hexToBytes } from '../../utils'
import { txidToFilterBytes } from '../../utils/txidToFilterBytes'

export interface CommitAssetLockParams {
  wallet: Wallet
  // The deposit the asset lock spends, and the key that owns it.
  fundingAddress: string
  fundingTxid: string
  fundingKey: PrivateKeyWASM
  // Owner of the credit output, which is what signs the Platform side.
  creditOutputAddress: string
  // What the credits are for, recorded so an interrupted operation leaves a
  // trace of what was started.
  purpose: AssetLockFundingPurpose
  identityId: string | null
  platformAddress: string | null
  // Both scoped to the (network, wallet) the operation runs against.
  assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository
  pendingAssetLocksRepository: PendingAssetLocksRepository
}

export interface CommittedAssetLock {
  assetLockTxid: string
  lockedAmount: bigint
  assetLockProof: AssetLockProofWASM
}

/**
 * Turns a deposit on an asset lock funding address into credits waiting on L1:
 * builds the asset lock, broadcasts it, waits for its instant or chain lock and
 * hands back the proof the Platform side needs.
 *
 * The build is deterministic, so a repeated operation rebuilds the same
 * transaction and recognises the one it already broadcast instead of locking the
 * deposit twice.
 */
export class AssetLockService {
  sdk: DashPlatformSDK
  coreSDK: DashCoreSDK

  constructor (sdk: DashPlatformSDK, coreSDK: DashCoreSDK) {
    this.sdk = sdk
    this.coreSDK = coreSDK
  }

  async commit (params: CommitAssetLockParams): Promise<CommittedAssetLock> {
    const {
      fundingAddress,
      fundingTxid,
      fundingKey,
      creditOutputAddress,
      assetLockFundingAddressesRepository,
      pendingAssetLocksRepository
    } = params

    const entry = await assetLockFundingAddressesRepository.getByAddress(fundingAddress)

    const { assetLockTx, lockedAmount } = await buildAssetLockFromFundingTx(
      this.coreSDK,
      fundingTxid,
      fundingAddress,
      fundingKey.WIF(),
      creditOutputAddress
    )

    const assetLockTxid = assetLockTx.hash()

    if (entry?.assetLockTxid != null && entry.assetLockTxid !== assetLockTxid) {
      throw new Error(
        `Asset lock funding address ${fundingAddress} is already broadcasted ` +
        `with a different asset lock txid (${entry.assetLockTxid})`
      )
    }

    // Opened in both the fresh and the repeated case: waitForAssetLockProof
    // needs it to receive instant lock events for a transaction that is not
    // chain-locked yet.
    const instantLockSub = this.coreSDK.subscribeToTransactions(
      [fundingAddress],
      [txidToFilterBytes(assetLockTxid)]
    )

    if (entry?.assetLockTxid == null) {
      // Written before the transaction can reach the network: from here on the
      // funds are committed on L1, and an interruption has to leave a trace of
      // what was started. Removed by the caller once the credits arrive.
      await pendingAssetLocksRepository.create({
        assetLockTxid,
        fundingAddress,
        fundingTxid,
        purpose: params.purpose,
        identityId: params.identityId,
        platformAddress: params.platformAddress,
        amountDuffs: lockedAmount.toString(),
        createdAt: Date.now()
      })

      try {
        await this.coreSDK.broadcastTransaction(assetLockTx.bytes())
      } catch (e) {
        // Rebuilt byte for byte, this is the same transaction as the one an
        // earlier attempt sent, and the network rejecting it as known is not a
        // failure.
        if (await this.coreSDK.getTransaction(assetLockTxid).catch(() => null) == null) {
          throw e
        }
      }

      if (entry != null) {
        await assetLockFundingAddressesRepository.markAsBroadcasted(fundingAddress, assetLockTxid)
      }
    }

    const assetLockProof = await waitForAssetLockProof(
      this.coreSDK,
      this.sdk,
      assetLockTx,
      assetLockTxid,
      instantLockSub
    )

    // The wait races the instant lock and the chain lock, so the proof may be of
    // either kind - build the matching WASM proof for each.
    const assetLockProofWasm = assetLockProof.type === 'instantLock'
      ? AssetLockProofWASM.createInstantAssetLockProof(
        hexToBytes(assetLockProof.instantLock),
        hexToBytes(assetLockProof.transaction),
        assetLockProof.outputIndex
      )
      : AssetLockProofWASM.createChainAssetLockProof(
        assetLockProof.coreChainLockedHeight,
        new OutPointWASM(assetLockTxid, assetLockProof.outputIndex)
      )

    return { assetLockTxid, lockedAmount, assetLockProof: assetLockProofWasm }
  }
}
