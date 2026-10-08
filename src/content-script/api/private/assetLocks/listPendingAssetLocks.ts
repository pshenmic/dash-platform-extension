import { APIHandler } from '../../APIHandler'
import { EmptyPayload } from '../../../../types/messages/payloads/EmptyPayload'
import { ListPendingAssetLocksResponse, PendingAssetLock } from '../../../../types/messages/response/ListPendingAssetLocksResponse'
import { AssetLockFundingAddressesRepository } from '../../../repository/AssetLockFundingAddressesRepository'
import { PendingAssetLocksRepository } from '../../../repository/PendingAssetLocksRepository'

// Asset locks that are on L1 with their Platform side unfinished: an operation
// interrupted after the money was committed. Both ways of funding one are
// reported together - the wallet's own coins, which leave a record of their
// own, and a deposit address, whose entry is simply not marked used yet.
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

    const assetLocks: PendingAssetLock[] = pending.map(entry => ({
      assetLockTxid: entry.assetLockTxid,
      purpose: entry.purpose,
      identityId: entry.identityId,
      amountDuffs: entry.amountDuffs,
      createdAt: entry.createdAt,
      fundingAddress: null
    }))

    const known = new Set(assetLocks.map(entry => entry.assetLockTxid))

    for (const entry of deposits) {
      const assetLockTxid = entry.assetLockTxid as string

      if (known.has(assetLockTxid)) {
        continue
      }

      assetLocks.push({
        assetLockTxid,
        purpose: entry.purpose ?? 'registration',
        identityId: entry.identityId ?? null,
        amountDuffs: null,
        createdAt: null,
        fundingAddress: entry.address
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
