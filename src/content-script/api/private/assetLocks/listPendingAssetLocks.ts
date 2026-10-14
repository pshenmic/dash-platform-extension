import { APIHandler } from '../../APIHandler'
import { EmptyPayload } from '../../../../types/messages/payloads/EmptyPayload'
import { ListPendingAssetLocksResponse, PendingAssetLock } from '../../../../types/messages/response/ListPendingAssetLocksResponse'
import { AssetLockFundingAddressesRepository } from '../../../repository/AssetLockFundingAddressesRepository'
import { PendingAssetLocksRepository } from '../../../repository/PendingAssetLocksRepository'
import { AssetLockFundingAddressSchema } from '../../../storage/storageSchema'

// Who a deposit address was reserved for. A registration names nobody - it
// creates its recipient - and so does a shield into the wallet's own pool,
// which is reserved under 'own' and reported as no address at all.
const recipientOf = (entry: AssetLockFundingAddressSchema): {
  identityId: string | null
  platformAddress: string | null
  shieldedAddress: string | null
} => {
  const purpose = entry.purpose ?? 'registration'
  const shielded = purpose === 'shield' && entry.recipient !== 'own' ? entry.recipient ?? null : null

  return {
    identityId: entry.identityId ?? null,
    platformAddress: purpose === 'fundAddress' ? entry.recipient ?? null : null,
    shieldedAddress: shielded
  }
}

// Operations with the wallet's money in them and nothing finished: an asset
// lock on L1 whose Platform side never ran, and a funding address this wallet
// paid before the asset lock could follow. The second one is money the user can
// no longer see in the balance, so it has to be reported just as loudly as the
// first.
//
// Three sources end up in one list: the records the chains write before they
// broadcast an asset lock, deposit addresses whose asset lock is on L1 but not
// consumed, and addresses paid with nothing on L1 yet.
export class ListPendingAssetLocksHandler implements APIHandler {
  pendingAssetLocksRepository: PendingAssetLocksRepository
  assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository

  constructor (
    pendingAssetLocksRepository: PendingAssetLocksRepository,
    assetLockFundingAddressesRepository: AssetLockFundingAddressesRepository
  ) {
    this.pendingAssetLocksRepository = pendingAssetLocksRepository
    this.assetLockFundingAddressesRepository = assetLockFundingAddressesRepository
  }

  async handle (): Promise<ListPendingAssetLocksResponse> {
    const pending = await this.pendingAssetLocksRepository.getAll()
    const deposits = await this.assetLockFundingAddressesRepository.findAllBroadcasted()
    const funded = await this.assetLockFundingAddressesRepository.findAllFundedWithoutAssetLock()

    const assetLocks: PendingAssetLock[] = pending.map(entry => ({
      assetLockTxid: entry.assetLockTxid,
      stage: 'assetLocked',
      fundingAddress: entry.fundingAddress,
      fundingTxid: entry.fundingTxid,
      purpose: entry.purpose,
      identityId: entry.identityId,
      platformAddress: entry.platformAddress,
      shieldedAddress: entry.shieldedAddress,
      amountDuffs: entry.amountDuffs,
      createdAt: entry.createdAt
    }))

    const known = new Set(assetLocks.map(entry => entry.assetLockTxid))

    for (const entry of deposits) {
      const assetLockTxid = entry.assetLockTxid as string

      if (known.has(assetLockTxid)) {
        continue
      }

      assetLocks.push({
        assetLockTxid,
        stage: 'assetLocked',
        fundingAddress: entry.address,
        fundingTxid: entry.fundingTxid ?? null,
        purpose: entry.purpose ?? 'registration',
        ...recipientOf(entry),
        amountDuffs: entry.fundedAmountDuffs ?? null,
        createdAt: entry.fundedAt ?? null
      })
    }

    // Paid, with no asset lock yet: the money left the balance and sits on the
    // funding address until the operation is asked for again.
    for (const entry of funded) {
      assetLocks.push({
        assetLockTxid: null,
        stage: 'funded',
        fundingAddress: entry.address,
        fundingTxid: entry.fundingTxid as string,
        purpose: entry.purpose ?? 'registration',
        ...recipientOf(entry),
        amountDuffs: entry.fundedAmountDuffs ?? null,
        createdAt: entry.fundedAt ?? null
      })
    }

    // Newest first; entries with no time recorded go last.
    return {
      assetLocks: assetLocks.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
    }
  }

  validatePayload (payload: EmptyPayload): string | null {
    return null
  }
}
