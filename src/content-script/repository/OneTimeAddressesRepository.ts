import { StorageAdapter } from '../storage/storageAdapter'
import { OneTimeAddressSchema, OneTimeAddressesSchema } from '../storage/storageSchema'
import { encrypt } from 'eciesjs'
import { bytesToHex, hexToBytes } from '../../utils'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { Network, PrivateKeyWASM } from 'dash-platform-sdk/types'
import { generateRandomHex } from '../../utils'

export class OneTimeAddressesRepository {
  storageAdapter: StorageAdapter
  sdk: DashPlatformSDK

  constructor (storageAdapter: StorageAdapter, sdk: DashPlatformSDK) {
    this.storageAdapter = storageAdapter
    this.sdk = sdk
  }

  async create (): Promise<OneTimeAddressSchema> {
    const network = await this.storageAdapter.get('network') as string
    const walletId = await this.storageAdapter.get('currentWalletId') as string | null

    if (walletId == null) {
      throw new Error('Wallet is not chosen')
    }

    const passwordPublicKey = await this.storageAdapter.get('passwordPublicKey') as string | null

    if (passwordPublicKey == null) {
      throw new Error('Password is not set for an extension')
    }

    const privateKeyWASM = PrivateKeyWASM.fromHex(generateRandomHex(64), network)
    const address = this.sdk.keyPair.p2pkhAddress(privateKeyWASM.getPublicKey().bytes(), network as Network)
    const encryptedPrivateKey = bytesToHex(encrypt(passwordPublicKey, hexToBytes(privateKeyWASM.hex())))

    const storageKey = `oneTimeAddresses_${network}_${walletId}`

    const oneTimeAddresses = (await this.storageAdapter.get(storageKey) ?? {}) as OneTimeAddressesSchema

    const entry: OneTimeAddressSchema = { address, encryptedPrivateKey }

    oneTimeAddresses[address] = entry

    await this.storageAdapter.set(storageKey, oneTimeAddresses)

    return entry
  }

  async getByAddress (address: string): Promise<OneTimeAddressSchema | null> {
    const network = await this.storageAdapter.get('network') as string
    const walletId = await this.storageAdapter.get('currentWalletId') as string | null

    if (walletId == null) {
      throw new Error('Wallet is not chosen')
    }

    const storageKey = `oneTimeAddresses_${network}_${walletId}`

    const oneTimeAddresses = (await this.storageAdapter.get(storageKey) ?? {}) as OneTimeAddressesSchema

    return oneTimeAddresses[address] ?? null
  }
}