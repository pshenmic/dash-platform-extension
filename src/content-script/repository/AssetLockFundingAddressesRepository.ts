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

  // `identityId` narrows the result to addresses reserved for that identity.
  // Entries with no owner still match: they predate per-identity reservation, and
  // may already hold a deposit, so the caller reuses and claims them rather than
  // stranding the money.
  async findAllUnused (purpose: AssetLockFundingPurpose = 'registration', identityId?: string): Promise<AssetLockFundingAddressSchema[]> {
    const storageKey = await this.getStorageKey()
    const addresses = (await this.storageAdapter.get(storageKey) ?? {}) as AssetLockFundingAddressesSchema

    return Object.values(addresses).filter(
      entry => !entry.used &&
        entry.assetLockTxid == null &&
        (entry.purpose ?? 'registration') === purpose &&
        (identityId == null || entry.identityId == null || entry.identityId === identityId)
    )
  }

  async findUnused (purpose: AssetLockFundingPurpose = 'registration'): Promise<AssetLockFundingAddressSchema | null> {
    return (await this.findAllUnused(purpose))[0] ?? null
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
