import { StorageAdapter } from '../storage/storageAdapter'
import { Identity } from '../../types/Identity'
import { DashPlatformProtocolWASM } from 'pshenmic-dpp'
import { IdentitiesStoreSchema, IdentityStoreSchema } from '../storage/storageSchema'
import { DashPlatformSDK } from 'dash-platform-sdk'

export class IdentitiesRepository {
  dpp: DashPlatformProtocolWASM
  storageAdapter: StorageAdapter
  sdk: DashPlatformSDK

  constructor (storageAdapter: StorageAdapter, dpp: DashPlatformProtocolWASM, sdk: DashPlatformSDK) {
    this.sdk = sdk
    this.dpp = dpp
    this.storageAdapter = storageAdapter
  }

  async create (identifier: string): Promise<Identity> {
    const network = await this.storageAdapter.get('network')
    const walletId = await this.storageAdapter.get('currentWalletId')

    const storageKey = `identities_${network}_${walletId}`

    const identities = (await this.storageAdapter.get(storageKey) ?? {}) as IdentitiesStoreSchema

    if (identities[identifier]) {
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
      identityPublicKeys: await this.sdk.identities.getIdentityPublicKeys(identifier),
      index: identityStoreSchema.index,
      label: identityStoreSchema.label
    }
  }

  async getAll (): Promise<Identity[]> {
    const network = await this.storageAdapter.get('network')
    const walletId = await this.storageAdapter.get('currentWalletId')

    const storageKey = `identities_${network}_${walletId}`

    const identities = (await this.storageAdapter.get(storageKey) ?? {}) as IdentitiesStoreSchema

    if (!identities || (Object.keys(identities).length === 0)) {
      return []
    }

    return await Promise.all(Object.entries(identities)
      .map(async ([identifier, entry]) =>
        ({
          identifier,
          identityPublicKeys: await this.sdk.identities.getIdentityPublicKeys(identifier),
          index: entry.index,
          label: entry.label
        }
        )
      ))
  }

  async getByIdentifier (identifier: string): Promise<Identity | null> {
    const network = await this.storageAdapter.get('network')
    const walletId = await this.storageAdapter.get('currentWalletId')

    const storageKey = `identities_${network}_${walletId}`

    const identities = (await this.storageAdapter.get(storageKey) ?? {}) as IdentitiesStoreSchema

    const identity = identities[identifier]

    if (!identities[identifier]) {
      return null
    }

    return {
      index: identity.index,
      identifier: identity.identifier,
      label: identity.label,
      identityPublicKeys: await this.sdk.identities.getIdentityPublicKeys(identifier)
    }
  }

  async getCurrent (): Promise<Identity | null> {
    const currentIdentity = await this.storageAdapter.get('currentIdentity') as string

    if (!currentIdentity) {
      return null
    }

    const identity = await this.getByIdentifier(currentIdentity)

    if (identity == null) {
      throw new Error(`Could not find current identity ${currentIdentity}`)
    }

    return identity
  }
}
