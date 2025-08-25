import { StorageAdapter } from '../storage/storageAdapter'
import { bytesToHex, generateWalletId, utf8ToBytes } from '../../utils'
import { Network } from '../../types/enums/Network'
import { WalletStoreSchema } from '../storage/storageSchema'
import { WalletType } from '../../types/WalletType'
import { Wallet } from '../../types/Wallet'
import { IdentitiesRepository } from './IdentitiesRepository'
import { encrypt } from 'eciesjs'
import hash from 'hash.js'

export class WalletRepository {
  storageAdapter: StorageAdapter
  identitiesRepository: IdentitiesRepository

  constructor (storageAdapter: StorageAdapter, identitiesRepository: IdentitiesRepository) {
    this.storageAdapter = storageAdapter
    this.identitiesRepository = identitiesRepository
  }

  async create (walletType: WalletType, mnemonic?: string): Promise<Wallet> {
    let encryptedMnemonic: string | null = null
    let seedHash: string | null = null

    const currentNetwork = await this.storageAdapter.get('network') as string

    const passwordPublicKey = await this.storageAdapter.get('passwordPublicKey') as string | null

    if (passwordPublicKey == null) {
      throw new Error('Password is not set for an extension')
    }

    const walletId = generateWalletId()

    const storageKey = `wallet_${currentNetwork}_${walletId}`

    const wallet = await this.storageAdapter.get(storageKey) as WalletStoreSchema

    if (wallet != null) {
      throw new Error('Wallet with such id already exists')
    }

    if (walletType === WalletType.seedphrase) {
      if (mnemonic == null) {
        throw new Error('Mnemonic is missing')
      }

      encryptedMnemonic = bytesToHex(encrypt(passwordPublicKey, utf8ToBytes(mnemonic)))
      seedHash = hash.sha256().update(mnemonic).digest('hex')
    }

    const walletSchema: WalletStoreSchema = {
      label: null,
      network: Network[currentNetwork],
      type: walletType,
      walletId,
      encryptedMnemonic,
      seedHash,
      currentIdentity: null
    }

    await this.storageAdapter.set(storageKey, walletSchema)

    return { ...walletSchema, type: WalletType[walletType] }
  }

  async getCurrent (): Promise<Wallet | null> {
    const network = await this.storageAdapter.get('network') as string
    const currentWalletId = await this.storageAdapter.get('currentWalletId') as string

    if (currentWalletId == null) {
      return null
    }

    const storageKey = `wallet_${network}_${currentWalletId}`

    const wallet = await this.storageAdapter.get(storageKey)

    if (wallet == null) {
      throw new Error(`Could not find wallet by id ${currentWalletId}`)
    }

    const walletStoreSchema = wallet as WalletStoreSchema

    return {
      walletId: walletStoreSchema.walletId,
      type: WalletType[walletStoreSchema.type],
      network: Network[network],
      label: walletStoreSchema.label,
      encryptedMnemonic: walletStoreSchema.encryptedMnemonic,
      seedHash: walletStoreSchema.seedHash,
      currentIdentity: walletStoreSchema.currentIdentity
    }
  }

  async getAll (): Promise<Wallet[]> {
    const network = await this.storageAdapter.get('network') as string
    const walletIds = await this.storageAdapter.get('wallets') as string[]

    const wallets = await Promise.all(walletIds.map(async walletId => (await this.storageAdapter.get(`wallet_${network}_${walletId}`)) as WalletStoreSchema))

    return wallets
        .filter(wallet => wallet !=null)
        .map(walletStoreSchema => (
      {
        walletId: walletStoreSchema.walletId,
        type: WalletType[walletStoreSchema.type],
        network: Network[walletStoreSchema.network],
        label: walletStoreSchema.label,
        encryptedMnemonic: walletStoreSchema.encryptedMnemonic,
        seedHash: walletStoreSchema.seedHash,
        currentIdentity: walletStoreSchema.currentIdentity
      }
    ))
  }

  async getById (walletId: string): Promise<Wallet | null> {
    const network = await this.storageAdapter.get('network') as string

    const all = await this.storageAdapter.getAll()
    const wallet = await this.storageAdapter.get(`wallet_${network}_${walletId}`)

    if (wallet == null) {
      return null
    }

    const walletStoreSchema = wallet as WalletStoreSchema

    return {
      walletId: walletStoreSchema.walletId,
      type: WalletType[walletStoreSchema.type],
      network: Network[walletStoreSchema.network],
      label: walletStoreSchema.label,
      encryptedMnemonic: walletStoreSchema.encryptedMnemonic,
      seedHash: walletStoreSchema.seedHash,
      currentIdentity: walletStoreSchema.currentIdentity
    }
  }

  async switchIdentity (identifier: string): Promise<void> {
    const currentWallet = await this.getCurrent()
    const network = await this.storageAdapter.get('network') as string

    if (currentWallet == null) {
      throw new Error('Wallet is not chosen')
    }

    const storageKey = `wallet_${network}_${currentWallet.walletId}`

    const walletStoreSchema = await this.storageAdapter.get(storageKey) as WalletStoreSchema

    if (walletStoreSchema == null) {
      throw new Error('Could not find wallet in the store')
    }

    const identity = await this.identitiesRepository.getByIdentifier(identifier)

    if (identity == null) {
      throw new Error(`Identity with identifier ${identifier} does not exists`)
    }

    await this.storageAdapter.set(storageKey, { ...walletStoreSchema, currentIdentity: identity.identifier })
  }
}
