import { StorageAdapter } from '../storage/storageAdapter'
import { Identity } from '../../types/Identity'
import { IdentitiesStoreSchema, IdentityStoreSchema } from '../storage/storageSchema'
import { DashPlatformSDK } from 'dash-platform-sdk'

export class IdentitiesRepository {
  storageAdapter: StorageAdapter
  sdk: DashPlatformSDK

  constructor (storageAdapter: StorageAdapter, sdk: DashPlatformSDK) {
    this.sdk = sdk
    this.storageAdapter = storageAdapter
  }

  async create (identifier: string): Promise<Identity> {
    const network = await this.storageAdapter.get('network') as string
    const walletId = await this.storageAdapter.get('currentWalletId') as string | null

    if (walletId == null) {
      throw new Error('Wallet is not chosen')
    }

    const storageKey = `identities_${network}_${walletId}`

    const identities = (await this.storageAdapter.get(storageKey) ?? {}) as IdentitiesStoreSchema

    if (identities[identifier] != null) {
      throw new Error(`Identity with identifier ${identifier} already exists`)
    }

    const allIdentityIds = Object.entries(identities)
      .map(([, entry]) => (entry.index))
    const index = Math.max(...allIdentityIds) + 1

    const identityStoreSchema: IdentityStoreSchema = {
      index,
      label: null,
      identifier
    }

    identities[identifier] = identityStoreSchema

    await this.storageAdapter.set(storageKey, identities)
    await this.storageAdapter.set('currentIdentity', identifier)

    return {
      identifier: identityStoreSchema.identifier,
      index: identityStoreSchema.index,
      label: identityStoreSchema.label
    }
  }

  async replaceAll (identities: Identity[]): Promise<void> {
    const network = await this.storageAdapter.get('network') as string
    const walletId = await this.storageAdapter.get('currentWalletId') as string | null

    if (walletId == null) {
      throw new Error('Wallet is not chosen')
    }

    const storageKey = `identities_${network}_${walletId}`

    const identitiesSchema: IdentitiesStoreSchema = identities.reduce((acc, value) => {
      const schema: IdentityStoreSchema = {
        index: value.index,
        identifier: value.identifier,
        label: null
      }

      return { ...acc, [value.identifier]: schema }
    }, {})

    await this.storageAdapter.set(storageKey, identitiesSchema)
  }

  async getAll (): Promise<Identity[]> {
    const network = await this.storageAdapter.get('network') as string
    const walletId = await this.storageAdapter.get('currentWalletId') as string | null

    if (walletId == null) {
      throw new Error('Wallet is not chosen')
    }

    const storageKey = `identities_${network}_${walletId}`

    const identities = (await this.storageAdapter.get(storageKey) ?? {}) as IdentitiesStoreSchema

    return await Promise.all(Object.entries(identities)
      .map(async ([identifier, entry]) =>
        ({
          identifier,
          index: entry.index,
          label: entry.label
        })
      ))
  }

  async getByIdentifier (identifier: string): Promise<Identity | null> {
    const network = await this.storageAdapter.get('network') as string
    const walletId = await this.storageAdapter.get('currentWalletId') as string | null

    if (walletId == null) {
      throw new Error('Wallet is not chosen')
    }

    const storageKey = `identities_${network}_${walletId}`

    const identities = (await this.storageAdapter.get(storageKey) ?? {}) as IdentitiesStoreSchema

    const identity = identities[identifier]

    if (identities[identifier] == null) {
      return null
    }

    return {
      index: identity.index,
      identifier: identity.identifier,
      label: identity.label
    }
  }

  async getCurrent (): Promise<Identity | null> {
    const currentIdentity = await this.storageAdapter.get('currentIdentity') as string | null

    if (currentIdentity == null) {
      return null
    }

    const identity = await this.getByIdentifier(currentIdentity)

    if (identity == null) {
      throw new Error(`Could not find current identity ${currentIdentity}`)
    }

    return identity
  }
}
