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

  async save (entry: AssetLockFundingAddressSchema): Promise<void> {
    const { storageKey, addresses } = await this.load()

    addresses[entry.address] = entry
    await this.storageAdapter.set(storageKey, addresses)
  }

  async markAsUsed (address: string): Promise<void> {
    const { storageKey, addresses } = await this.load()

    if (addresses[address] == null) return

    addresses[address] = { ...addresses[address], used: true }
    await this.storageAdapter.set(storageKey, addresses)
  }

  async findByIdentityIndex (identityIndex: number): Promise<AssetLockFundingAddressSchema | null> {
    const { addresses } = await this.load()

    return Object.values(addresses).find(
      (entry) => Number.isSafeInteger(entry.identityIndex) && entry.identityIndex === identityIndex
    ) ?? null
  }

  async getByAddress (address: string): Promise<AssetLockFundingAddressSchema | null> {
    const { addresses } = await this.load()

    return addresses[address] ?? null
  }

  private async load (): Promise<{ storageKey: string, addresses: AssetLockFundingAddressesSchema }> {
    const network = await this.storageAdapter.get('network') as string
    const walletId = await this.storageAdapter.get('currentWalletId') as string | null

    if (walletId == null) throw new Error('Wallet is not chosen')

    const storageKey = `assetLockFundingAddresses_${network}_${walletId}`
    const addresses = (await this.storageAdapter.get(storageKey) ?? {}) as AssetLockFundingAddressesSchema

    return { storageKey, addresses }
  }
}
