import { StorageAdapter } from '../storage/storageAdapter'
import { Identity } from '../../types'
import { IdentitiesStoreSchema, IdentityStoreSchema } from '../storage/storageSchema'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { IdentityType } from '../../types/enums/IdentityType'
import { RepositoryScope } from '../../types/RepositoryScope'

export class IdentitiesRepository {
  storageAdapter: StorageAdapter
  sdk: DashPlatformSDK
  scope?: RepositoryScope

  constructor (storageAdapter: StorageAdapter, sdk: DashPlatformSDK, scope?: RepositoryScope) {
    this.sdk = sdk
    this.storageAdapter = storageAdapter
    this.scope = scope
  }

  // Returns a repository pinned to one (network, wallet) pair. Callers that must
  // keep addressing the same wallet across a long operation use this instead of
  // the shared instance, which re-reads the current wallet on every call.
  forScope (scope: RepositoryScope): IdentitiesRepository {
    return new IdentitiesRepository(this.storageAdapter, this.sdk, scope)
  }

  private async getStorageKey (): Promise<string> {
    if (this.scope != null) {
      return `identities_${this.scope.network}_${this.scope.walletId}`
    }

    const network = await this.storageAdapter.get('network') as string
    const walletId = await this.storageAdapter.get('currentWalletId') as string | null

    if (walletId == null) {
      throw new Error('Wallet is not chosen')
    }

    return `identities_${network}_${walletId}`
  }

  async create (identifier: string, type: IdentityType, index: number, proTxHash?: string): Promise<Identity> {
    const storageKey = await this.getStorageKey()

    const identities = (await this.storageAdapter.get(storageKey) ?? {}) as IdentitiesStoreSchema

    if (identities[identifier] != null) {
      throw new Error(`Identity with identifier ${identifier} already exists`)
    }

    if (!Number.isSafeInteger(index) || index < 0) {
      throw new Error(`Identity index must be a non-negative integer: ${index}`)
    }

    const indexInUse = Object.values(identities).some((entry) => entry.index === index)

    if (indexInUse) {
      throw new Error(`Identity index ${index} is already used`)
    }

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
    const storageKey = await this.getStorageKey()

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
    const storageKey = await this.getStorageKey()

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

  async remove (identifier: string): Promise<void> {
    const storageKey = await this.getStorageKey()

    const identities = (await this.storageAdapter.get(storageKey) ?? {}) as IdentitiesStoreSchema

    if (identities[identifier] == null) {
      return
    }

    const { [identifier]: _removed, ...rest } = identities

    await this.storageAdapter.set(storageKey, rest)
  }

  async getByIdentifier (identifier: string): Promise<Identity | null> {
    const storageKey = await this.getStorageKey()

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
