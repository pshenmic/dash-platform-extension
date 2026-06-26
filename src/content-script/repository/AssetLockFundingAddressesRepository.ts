import { StorageAdapter } from '../storage/storageAdapter'
import {
  AssetLockFundingAddressSchema,
  AssetLockFundingAddressesSchema,
  AssetLockFundingPurpose
} from '../storage/storageSchema'

export class AssetLockFundingAddressesRepository {
  storageAdapter: StorageAdapter

  constructor (storageAdapter: StorageAdapter) {
    this.storageAdapter = storageAdapter
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

  async markAsBroadcasted (address: string, assetLockTxid: string): Promise<void> {
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

    addresses[address] = { ...entry, assetLockTxid }

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
    const network = await this.storageAdapter.get('network') as string
    const walletId = await this.storageAdapter.get('currentWalletId') as string | null

    if (walletId == null) throw new Error('Wallet is not chosen')

    return `assetLockFundingAddresses_${network}_${walletId}`
  }
}
