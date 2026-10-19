import { StorageAdapter } from '../storage/storageAdapter'
import {
  AssetLockFundingAddressSchema,
  AssetLockFundingAddressesSchema,
  AssetLockFundingPurpose
} from '../storage/storageSchema'
import { RepositoryScope } from '../../types/RepositoryScope'

export class AssetLockFundingAddressesRepository {
  storageAdapter: StorageAdapter
  scope?: RepositoryScope

  constructor (storageAdapter: StorageAdapter, scope?: RepositoryScope) {
    this.storageAdapter = storageAdapter
    this.scope = scope
  }

  // Returns a repository pinned to one (network, wallet) pair. Callers that must
  // keep addressing the same wallet across a long operation use this instead of
  // the shared instance, which re-reads the current wallet on every call.
  forScope (scope: RepositoryScope): AssetLockFundingAddressesRepository {
    return new AssetLockFundingAddressesRepository(this.storageAdapter, scope)
  }

  async create (entry: AssetLockFundingAddressSchema): Promise<AssetLockFundingAddressSchema> {
    const storageKey = await this.getStorageKey()
    const addresses = (await this.storageAdapter.get(storageKey) ?? {}) as AssetLockFundingAddressesSchema

    addresses[entry.address] = entry

    await this.storageAdapter.set(storageKey, addresses)

    return entry
  }

  async markAsUsed (address: string): Promise<void> {
    const storageKey = await this.getStorageKey()
    const addresses = (await this.storageAdapter.get(storageKey) ?? {}) as AssetLockFundingAddressesSchema

    if (addresses[address] == null) {
      throw new Error(`Asset lock funding address ${address} not found`)
    }

    addresses[address] = { ...addresses[address], used: true }

    await this.storageAdapter.set(storageKey, addresses)
  }

  async markAsBroadcasted (address: string, assetLockTxid: string, registrationIdentityIndex?: number): Promise<void> {
    const storageKey = await this.getStorageKey()
    const addresses = (await this.storageAdapter.get(storageKey) ?? {}) as AssetLockFundingAddressesSchema

    const entry = addresses[address]

    if (entry == null) {
      throw new Error(`Asset lock funding address ${address} not found`)
    }

    if (entry.used) {
      throw new Error(`Asset lock funding address ${address} has already been used`)
    }

    if (entry.assetLockTxid != null && entry.assetLockTxid !== assetLockTxid) {
      throw new Error(
        `Asset lock funding address ${address} is already broadcasted with txid ${entry.assetLockTxid}`
      )
    }

    if (entry.assetLockTxid === assetLockTxid) {
      return
    }

    addresses[address] = { ...entry, assetLockTxid, registrationIdentityIndex }

    await this.storageAdapter.set(storageKey, addresses)
  }

  // Records the wallet's own payment to a funding address, before that
  // transaction is broadcast. Idempotent for the same txid; a second, different
  // payment is refused rather than overwriting the first, because the asset lock
  // is built from one funding transaction and the earlier payment would be left
  // at the address with nothing coming back for it.
  async markAsFunded (address: string, fundingTxid: string, amountDuffs?: string, fundingTxHex?: string): Promise<void> {
    const storageKey = await this.getStorageKey()
    const addresses = (await this.storageAdapter.get(storageKey) ?? {}) as AssetLockFundingAddressesSchema

    const entry = addresses[address]

    if (entry == null) {
      throw new Error(`Asset lock funding address ${address} not found`)
    }

    if (entry.used) {
      throw new Error(`Asset lock funding address ${address} has already been used`)
    }

    if (entry.fundingTxid === fundingTxid) {
      // Same payment again. Keep the bytes if this call brought them and the
      // record was written without them, so the payment stays re-sendable.
      if (fundingTxHex == null || entry.fundingTxHex != null) {
        return
      }

      addresses[address] = { ...entry, fundingTxHex }

      await this.storageAdapter.set(storageKey, addresses)

      return
    }

    if (entry.fundingTxid != null) {
      throw new Error(
        `Asset lock funding address ${address} is already funded by transaction ${entry.fundingTxid}`
      )
    }

    addresses[address] = {
      ...entry,
      fundingTxid,
      ...(amountDuffs != null ? { fundedAmountDuffs: amountDuffs, fundedAt: Date.now() } : {}),
      ...(fundingTxHex != null ? { fundingTxHex } : {})
    }

    await this.storageAdapter.set(storageKey, addresses)
  }

  // Forgets a payment that never reached the network, so the operation can pay
  // the address again. Only for a recorded transaction the network does not
  // know and cannot come to know: once an asset lock spends the deposit, or the
  // address is used, the payment is part of a committed chain and the caller has
  // to finish that chain instead.
  async clearFunding (address: string): Promise<void> {
    const storageKey = await this.getStorageKey()
    const addresses = (await this.storageAdapter.get(storageKey) ?? {}) as AssetLockFundingAddressesSchema

    const entry = addresses[address]

    if (entry == null) {
      throw new Error(`Asset lock funding address ${address} not found`)
    }

    if (entry.used || entry.assetLockTxid != null) {
      throw new Error(
        `Asset lock funding address ${address} has an asset lock built from its deposit and cannot be unfunded`
      )
    }

    const { fundingTxid, fundedAmountDuffs, fundedAt, fundingTxHex, ...rest } = entry

    addresses[address] = rest

    await this.storageAdapter.set(storageKey, addresses)
  }

  // Reserves an address for the recipient of a funding or a shield, the way
  // bindToIdentity reserves one for an identity. Idempotent for the same
  // recipient; an entry already reserved for another one is never re-pointed,
  // since that is how one recipient's deposit ends up credited to another.
  async bindToRecipient (address: string, recipient: string): Promise<void> {
    const storageKey = await this.getStorageKey()
    const addresses = (await this.storageAdapter.get(storageKey) ?? {}) as AssetLockFundingAddressesSchema

    const entry = addresses[address]

    if (entry == null) {
      throw new Error(`Asset lock funding address ${address} not found`)
    }

    if (entry.recipient === recipient) {
      return
    }

    if (entry.recipient != null) {
      throw new Error(
        `Asset lock funding address ${address} is already reserved for ${entry.recipient}`
      )
    }

    addresses[address] = { ...entry, recipient }

    await this.storageAdapter.set(storageKey, addresses)
  }

  // Reserves an address for an identity. Idempotent for the same identity; an
  // entry already reserved for another one is never silently re-pointed, since
  // that would hand two top-ups the same address again.
  async bindToIdentity (address: string, identityId: string): Promise<void> {
    const storageKey = await this.getStorageKey()
    const addresses = (await this.storageAdapter.get(storageKey) ?? {}) as AssetLockFundingAddressesSchema

    const entry = addresses[address]

    if (entry == null) {
      throw new Error(`Asset lock funding address ${address} not found`)
    }

    if (entry.identityId === identityId) {
      return
    }

    if (entry.identityId != null) {
      throw new Error(
        `Asset lock funding address ${address} is already reserved for identity ${entry.identityId}`
      )
    }

    addresses[address] = { ...entry, identityId }

    await this.storageAdapter.set(storageKey, addresses)
  }

  async getByAddress (address: string): Promise<AssetLockFundingAddressSchema | null> {
    const storageKey = await this.getStorageKey()
    const addresses = (await this.storageAdapter.get(storageKey) ?? {}) as AssetLockFundingAddressesSchema

    return addresses[address] ?? null
  }

  // `owner` narrows the result to addresses reserved for that recipient: an
  // identity for a top-up, a platform or shielded address for the others.
  // Entries with no owner still match: they predate reservation, and may already
  // hold a deposit, so the caller reuses and claims them rather than stranding
  // the money.
  async findAllUnused (purpose: AssetLockFundingPurpose = 'registration', owner?: string): Promise<AssetLockFundingAddressSchema[]> {
    const storageKey = await this.getStorageKey()
    const addresses = (await this.storageAdapter.get(storageKey) ?? {}) as AssetLockFundingAddressesSchema

    return Object.values(addresses).filter(entry => {
      const entryOwner = entry.identityId ?? entry.recipient

      return !entry.used &&
        entry.assetLockTxid == null &&
        (entry.purpose ?? 'registration') === purpose &&
        (owner == null || entryOwner == null || entryOwner === owner)
    })
  }

  // The mirror image of findAllUnused: deposit entries whose asset lock is on L1
  // but was never consumed. Money committed with nothing to show for it yet.
  async findAllBroadcasted (): Promise<AssetLockFundingAddressSchema[]> {
    const storageKey = await this.getStorageKey()
    const addresses = (await this.storageAdapter.get(storageKey) ?? {}) as AssetLockFundingAddressesSchema

    return Object.values(addresses).filter(entry => !entry.used && entry.assetLockTxid != null)
  }

  // Addresses this wallet paid for an operation that never reached its asset
  // lock: the money is on the address, nothing is on L1 yet, and the operation
  // only finishes when it is asked for again.
  async findAllFundedWithoutAssetLock (): Promise<AssetLockFundingAddressSchema[]> {
    const storageKey = await this.getStorageKey()
    const addresses = (await this.storageAdapter.get(storageKey) ?? {}) as AssetLockFundingAddressesSchema

    return Object.values(addresses).filter(
      entry => !entry.used && entry.assetLockTxid == null && entry.fundingTxid != null
    )
  }

  async findUnused (purpose: AssetLockFundingPurpose = 'registration', owner?: string): Promise<AssetLockFundingAddressSchema | null> {
    return (await this.findAllUnused(purpose, owner))[0] ?? null
  }

  private async getStorageKey (): Promise<string> {
    if (this.scope != null) {
      return `assetLockFundingAddresses_${this.scope.network}_${this.scope.walletId}`
    }

    const network = await this.storageAdapter.get('network') as string
    const walletId = await this.storageAdapter.get('currentWalletId') as string | null

    if (walletId == null) throw new Error('Wallet is not chosen')

    return `assetLockFundingAddresses_${network}_${walletId}`
  }
}
