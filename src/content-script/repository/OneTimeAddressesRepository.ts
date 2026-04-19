import { StorageAdapter } from '../storage/storageAdapter'
import { IdentitiesStoreSchema, OneTimeAddressSchema, OneTimeAddressesSchema } from '../storage/storageSchema'
import { encrypt } from 'eciesjs'
import { bytesToHex, deriveFundingPrivateKey, getNextIdentityIndex, hexToBytes } from '../../utils'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { Network, PrivateKeyWASM } from 'dash-platform-sdk/types'
import { WalletRepository } from './WalletRepository'
import { WalletType } from '../../types/WalletType'

export class OneTimeAddressesRepository {
  storageAdapter: StorageAdapter
  sdk: DashPlatformSDK
  walletRepository: WalletRepository

  constructor (storageAdapter: StorageAdapter, sdk: DashPlatformSDK, walletRepository: WalletRepository) {
    this.storageAdapter = storageAdapter
    this.sdk = sdk
    this.walletRepository = walletRepository
  }

  async create (password?: string): Promise<OneTimeAddressSchema> {
    const network = await this.storageAdapter.get('network') as string
    const walletId = await this.storageAdapter.get('currentWalletId') as string | null

    if (walletId == null) {
      throw new Error('Wallet is not chosen')
    }

    const passwordPublicKey = await this.storageAdapter.get('passwordPublicKey') as string | null

    if (passwordPublicKey == null) {
      throw new Error('Password is not set for an extension')
    }

    const storageKey = `oneTimeAddresses_${network}_${walletId}`

    const oneTimeAddresses = (await this.storageAdapter.get(storageKey) ?? {}) as OneTimeAddressesSchema
    const identitiesStorageKey = `identities_${network}_${walletId}`
    const identities = (await this.storageAdapter.get(identitiesStorageKey) ?? {}) as IdentitiesStoreSchema
    const nextIdentityIndex = getNextIdentityIndex(Object.values(identities).map((identity) => identity.index))

    const existingEntry = Object.values(oneTimeAddresses).find((entry) =>
      Number.isSafeInteger(entry.identityIndex) && entry.identityIndex === nextIdentityIndex
    )

    if (existingEntry != null) {
      return existingEntry
    }

    const wallet = await this.walletRepository.getCurrent()

    if (wallet == null) {
      throw new Error('Wallet is not chosen')
    }

    let privateKeyWASM: PrivateKeyWASM

    if (wallet.type === WalletType.seedphrase) {
      if (typeof password !== 'string' || password.length === 0) {
        throw new Error('Password is required to derive a deterministic registration address')
      }

      privateKeyWASM = await deriveFundingPrivateKey(
        wallet,
        password,
        nextIdentityIndex,
        this.sdk
      )
    } else {
      privateKeyWASM = PrivateKeyWASM.fromHex(generateSecureHex(32), network)
    }

    const address = this.sdk.keyPair.p2pkhAddress(privateKeyWASM.getPublicKey().bytes(), network as Network)
    const encryptedPrivateKey = bytesToHex(encrypt(passwordPublicKey, hexToBytes(privateKeyWASM.hex())))

    const entry: OneTimeAddressSchema = {
      address,
      encryptedPrivateKey,
      identityIndex: nextIdentityIndex
    }

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

  async removeByAddress (address: string): Promise<void> {
    const network = await this.storageAdapter.get('network') as string
    const walletId = await this.storageAdapter.get('currentWalletId') as string | null

    if (walletId == null) {
      throw new Error('Wallet is not chosen')
    }

    const storageKey = `oneTimeAddresses_${network}_${walletId}`
    const oneTimeAddresses = (await this.storageAdapter.get(storageKey) ?? {}) as OneTimeAddressesSchema

    if (oneTimeAddresses[address] == null) {
      return
    }

    const { [address]: _removed, ...nextOneTimeAddresses } = oneTimeAddresses

    await this.storageAdapter.set(storageKey, nextOneTimeAddresses)
  }
}

function generateSecureHex (byteLength: number): string {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}
