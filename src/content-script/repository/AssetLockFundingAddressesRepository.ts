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

  async getByAddress (address: string): Promise<AssetLockFundingAddressSchema | null> {
    const storageKey = await this.getStorageKey()
    const addresses = (await this.storageAdapter.get(storageKey) ?? {}) as AssetLockFundingAddressesSchema

    return addresses[address] ?? null
  }

  async findAllUnused (purpose: AssetLockFundingPurpose = 'registration'): Promise<AssetLockFundingAddressSchema[]> {
    const storageKey = await this.getStorageKey()
    const addresses = (await this.storageAdapter.get(storageKey) ?? {}) as AssetLockFundingAddressesSchema

    return Object.values(addresses).filter(
      entry => !entry.used && entry.assetLockTxid == null && (entry.purpose ?? 'registration') === purpose
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
