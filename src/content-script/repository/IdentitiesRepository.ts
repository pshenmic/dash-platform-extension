import { StorageAdapter } from '../storage/storageAdapter'
import { Identity } from '../../types'
import { IdentitiesStoreSchema, IdentityStoreSchema } from '../storage/storageSchema'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { IdentityType } from '../../types/enums/IdentityType'

export class IdentitiesRepository {
  storageAdapter: StorageAdapter
  sdk: DashPlatformSDK

  constructor (storageAdapter: StorageAdapter, sdk: DashPlatformSDK) {
    this.sdk = sdk
    this.storageAdapter = storageAdapter
  }

  async create (identifier: string, type: IdentityType, proTxHash?: string): Promise<Identity> {
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

    const index = Object.entries(identities)
      .map(([, entry]) => (entry.index))
      .reduce((acc, index) => Math.max(acc, index + 1), 0)

    const identityStoreSchema: IdentityStoreSchema = {
      index,
      label: null,
      proTxHash: proTxHash ?? null,
      type,
      identifier
    }

    identities[identifier] = identityStoreSchema

    await this.storageAdapter.set(storageKey, identities)

    return {
      identifier: identityStoreSchema.identifier,
      index: identityStoreSchema.index,
      label: identityStoreSchema.label,
      proTxHash: identityStoreSchema.proTxHash,
      type
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
        label: null,
        proTxHash: value.proTxHash,
        type: value.type
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
          label: entry.label,
          proTxHash: entry.proTxHash,
          type: entry.type as IdentityType
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
      proTxHash: identity.proTxHash,
      label: identity.label,
      type: identity.type as IdentityType
    }
  }
}
