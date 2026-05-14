import { StorageAdapter } from '../storage/storageAdapter'
import { WalletSettingsStoreSchema } from '../storage/storageSchema'

export interface WalletSettings {
  hideBalance: boolean
}

const DEFAULT_SETTINGS: WalletSettings = {
  hideBalance: false
}

export class WalletSettingsRepository {
  storageAdapter: StorageAdapter

  constructor (storageAdapter: StorageAdapter) {
    this.storageAdapter = storageAdapter
  }

  private async storageKey (): Promise<string> {
    const network = await this.storageAdapter.get('network') as string
    const walletId = await this.storageAdapter.get('currentWalletId') as string | null

    if (walletId == null) {
      throw new Error('Wallet is not chosen')
    }

    return `walletSettings_${network}_${walletId}`
  }

  async get (): Promise<WalletSettings> {
    const key = await this.storageKey()
    const stored = await this.storageAdapter.get(key) as WalletSettingsStoreSchema | null

    return stored ?? { ...DEFAULT_SETTINGS }
  }

  async set (settings: Partial<WalletSettings>): Promise<void> {
    const key = await this.storageKey()
    const current = await this.get()

    await this.storageAdapter.set(key, { ...current, ...settings })
  }
}