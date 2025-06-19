import { StorageAdapter } from '../storage/storageAdapter'
import { generateWalletId } from '../../utils'
import { Network } from '../../types/enums/Network'
import { WalletStoreSchema } from '../storage/storageSchema'
import { WalletType } from '../../types/WalletType'
import { Wallet } from '../../types/Wallet'
import { IdentitiesRepository } from './IdentitiesRepository'

export class WalletRepository {
  storageAdapter: StorageAdapter
  identitiesRepository: IdentitiesRepository

  constructor (storageAdapter: StorageAdapter, identitiesRepository: IdentitiesRepository) {
    this.storageAdapter = storageAdapter
    this.identitiesRepository = identitiesRepository
  }

  async create (type: WalletType): Promise<Wallet> {
    const currentNetwork = await this.storageAdapter.get('network') as string

    const passwordPublicKey = await this.storageAdapter.get('passwordPublicKey') as string | null

    if (passwordPublicKey == null) {
      throw new Error('Password is not set for an extension')
    }

    const walletId = generateWalletId()

    const storageKey = `wallet_${walletId}_${currentNetwork}`

    const wallet = await this.storageAdapter.get(storageKey) as WalletStoreSchema

    if (wallet != null) {
      throw new Error('Wallet with such id already exists')
    }

    const walletSchema: WalletStoreSchema = {
      currentIdentity: null,
      label: null,
      network: Network[currentNetwork],
      type,
      walletId
    }

    await this.storageAdapter.set(storageKey, walletSchema)

    return { ...walletSchema, type: WalletType[walletSchema.type] }
  }

  async getCurrent (): Promise<Wallet | null> {
    const network = await this.storageAdapter.get('network') as string
    const currentWalletId = await this.storageAdapter.get('currentWalletId') as string

    if (currentWalletId == null) {
      return null
    }

    const storageKey = `wallet_${currentWalletId}_${network}`

    const wallet = await this.storageAdapter.get(storageKey) as WalletStoreSchema

    if (wallet == null) {
      throw new Error('Could not find current wallet')
    }

    return {
      walletId: wallet.walletId,
      type: WalletType[wallet.type],
      network: Network[network],
      label: wallet.label,
      currentIdentity: wallet.currentIdentity
    }
  }

  async switchIdentity (identifier: string): Promise<void> {
    const currentWallet = await this.getCurrent()
    const network = await this.storageAdapter.get('network') as string

    if (currentWallet == null) {
      throw new Error('Wallet is not chosen')
    }

    const storageKey = `wallet_${currentWallet.walletId}_${network}`

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

  async switchWallet (network: Network, walletId: string): Promise<void> {
    await this.storageAdapter.set('network', network)
    await this.storageAdapter.set('currentWalletId', walletId)
  }
}
