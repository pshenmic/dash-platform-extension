import { EventData } from '../../../../types/EventData'
import { APIHandler } from '../../APIHandler'
import { KeypairRepository } from '../../../repository/KeypairRepository'
import { StorageAdapter } from '../../../storage/storageAdapter'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { VoidResponse } from '../../../../types/messages/response/VoidResponse'
import { ImportPendingKeysPayload } from '../../../../types/messages/payloads/ImportPendingKeysPayload'

export class ImportPendingKeysHandler implements APIHandler {
  keypairRepository: KeypairRepository
  storageAdapter: StorageAdapter
  sdk: DashPlatformSDK

  constructor (keypairRepository: KeypairRepository, storageAdapter: StorageAdapter, sdk: DashPlatformSDK) {
    this.keypairRepository = keypairRepository
    this.storageAdapter = storageAdapter
    this.sdk = sdk
  }

  async handle (event: EventData): Promise<VoidResponse> {
    const payload: ImportPendingKeysPayload = event.payload
    const identityId = payload.identity

    try {
      // Fetch updated identity from network to get the newly added keys
      const identityWASM = await this.sdk.identities.getIdentityByIdentifier(identityId)
      const identityPublicKeys = identityWASM.getPublicKeys()

      // Check all potential pending keys for this identity
      const allKeys = await this.storageAdapter.getAll()
      const pendingKeyPrefix = `pendingKey_${identityId}_`

      for (const [storageKey, value] of Object.entries(allKeys)) {
        if (storageKey.startsWith(pendingKeyPrefix)) {
          const pendingKeyData = value

          // Find matching public key on chain
          const matchingPublicKey = identityPublicKeys.find(
            (pk: any) => pk.getPublicKeyHash() === pendingKeyData.publicKeyHash
          )

          if (matchingPublicKey != null) {
            // Save to KeypairRepository
            await this.keypairRepository.add(
              pendingKeyData.identity,
              pendingKeyData.privateKey,
              matchingPublicKey
            )

            // Remove pending key from storage
            await this.storageAdapter.remove(storageKey)
          }
        }
      }

      return {}
    } catch (error) {
      console.error('Failed to import pending keys:', error)
      throw error
    }
  }

  validatePayload (payload: ImportPendingKeysPayload): string | null {
    if (typeof payload.identity !== 'string' || payload.identity.length === 0) {
      return 'Identity identifier must be provided'
    }

    return null
  }
}
