import { DashPlatformSDK } from 'dash-platform-sdk'
import { Network, PrivateKeyWASM } from 'dash-platform-sdk/types'
import { encrypt } from 'eciesjs'
import { StorageAdapter } from '../storage/storageAdapter'
import {
  AssetLockFundingAddressSchema,
  AssetLockFundingAddressesSchema
} from '../storage/storageSchema'
import { bytesToHex, generateRandomHex, hexToBytes } from '../../utils'

export class AssetLockFundingAddressesRepository {
  storageAdapter: StorageAdapter
  sdk: DashPlatformSDK

  constructor (storageAdapter: StorageAdapter, sdk: DashPlatformSDK) {
    this.storageAdapter = storageAdapter
    this.sdk = sdk
  }

  /**
   * Generates a fresh one-time funding key, encrypts it with the extension's
   * password public key, and stores the entry. Per DIP-0011 the registration
   * key (which signs IdentityCreateTransition and owns the asset lock credit
   * output) must only be used once — random generation guarantees this.
   */
  async create (): Promise<AssetLockFundingAddressSchema> {
    const storageKey = await this.getStorageKey()
    const network = await this.storageAdapter.get('network') as string

    const passwordPublicKey = await this.storageAdapter.get('passwordPublicKey') as string | null
    if (passwordPublicKey == null) throw new Error('Password is not set for an extension')

    const privateKeyWASM = PrivateKeyWASM.fromHex(generateRandomHex(64), network)
    const address = this.sdk.keyPair.p2pkhAddress(privateKeyWASM.getPublicKey().bytes(), network as Network)
    const encryptedPrivateKey = bytesToHex(encrypt(passwordPublicKey, hexToBytes(privateKeyWASM.hex())))

    const entry: AssetLockFundingAddressSchema = { address, encryptedPrivateKey, used: false }
    const addresses = (await this.storageAdapter.get(storageKey) ?? {}) as AssetLockFundingAddressesSchema
    addresses[entry.address] = entry

    await this.storageAdapter.set(storageKey, addresses)

    return entry
  }

  async markAsUsed (address: string): Promise<void> {
    const storageKey = await this.getStorageKey()
    const addresses = (await this.storageAdapter.get(storageKey) ?? {}) as AssetLockFundingAddressesSchema

    if (addresses[address] == null) return

    addresses[address] = { ...addresses[address], used: true }
    await this.storageAdapter.set(storageKey, addresses)
  }

  async getByAddress (address: string): Promise<AssetLockFundingAddressSchema | null> {
    const storageKey = await this.getStorageKey()
    const addresses = (await this.storageAdapter.get(storageKey) ?? {}) as AssetLockFundingAddressesSchema

    return addresses[address] ?? null
  }

  private async getStorageKey (): Promise<string> {
    const network = await this.storageAdapter.get('network') as string
    const walletId = await this.storageAdapter.get('currentWalletId') as string | null

    if (walletId == null) throw new Error('Wallet is not chosen')

    return `assetLockFundingAddresses_${network}_${walletId}`
  }
}
