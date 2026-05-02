import { StorageAdapter } from '../storage/storageAdapter'
import {
  AssetLockFundingAddressSchema,
  AssetLockFundingAddressesSchema
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

  async getByAddress (address: string): Promise<AssetLockFundingAddressSchema | null> {
    const storageKey = await this.getStorageKey()
    const addresses = (await this.storageAdapter.get(storageKey) ?? {}) as AssetLockFundingAddressesSchema

    return addresses[address] ?? null
  }

  async findUnused (): Promise<AssetLockFundingAddressSchema | null> {
    const storageKey = await this.getStorageKey()
    const addresses = (await this.storageAdapter.get(storageKey) ?? {}) as AssetLockFundingAddressesSchema

    return Object.values(addresses).find(entry => !entry.used) ?? null
  }

  private async getStorageKey (): Promise<string> {
    const network = await this.storageAdapter.get('network') as string
    const walletId = await this.storageAdapter.get('currentWalletId') as string | null

    if (walletId == null) throw new Error('Wallet is not chosen')

    return `assetLockFundingAddresses_${network}_${walletId}`
  }
}
