import { DashPlatformSDK } from 'dash-platform-sdk'
import { PublicAPI } from '../../../src/content-script/api/PublicAPI'
import { PublicAPIClient } from '../../../src/types/PublicAPIClient'
import { StorageAdapter } from '../../../src/content-script/storage/storageAdapter'
import { MemoryStorageAdapter } from '../../../src/content-script/storage/memoryStorageAdapter'
import { StateTransitionStoreSchema } from '../../../src/content-script/storage/storageSchema'
import { StateTransitionStatus } from '../../../src/types/enums/StateTransitionStatus'

describe('requestStateTransitionApproval tests', () => {
  let publicAPI: PublicAPI
  let publicAPIClient: PublicAPIClient
  let storage: StorageAdapter

  beforeAll(() => {
    const sdk = new DashPlatformSDK()
    const memoryStorageAdapter = new MemoryStorageAdapter()

    storage = memoryStorageAdapter
    publicAPI = new PublicAPI(sdk, memoryStorageAdapter)
    publicAPIClient = new PublicAPIClient()

    publicAPI.init()
  })

  test('should store a state transition', async () => {
    const base64 = 'AgHow50ZMBRg3NLhpHGheMKw37zyCy92h8Xq/nLmPO//pQEAAAABvzVamEjVJ8WrY12CGPD5XiHDuHOZMID4Pfa41Ta94IcCCHByZW9yZGVyMBbSwI1eE/eONjiHIhnkx+/9c1Mhk7cvBpAEum0ImpgADATOA1kQuI5q2LWL0Ic7rGgpyNMU9QZCztA+G+s1X6IBEHNhbHRlZERvbWFpbkhhc2gKIAH1lwDd9WSSQkMSnw9Vg9GmspbyKUizcTPCxtb0hLWEAAAEQR8BWHxKinHTht4HW4kOaX/C72FxmHCabQpB/d+JLanxbg1tYjOtQjZuMCmm+YD0aODuYIh15zZmmCKm8DFAnAr5'
    const hash = 'c8064d80f1d182d953fe78d76172eb0346755a77b5bf37b4f0ee26a102b371ed'

    const storageKey = 'stateTransitions'

    await storage.set(storageKey, {})

    const response = await publicAPIClient.requestTransactionApproval(base64)

    const expectedStateTransition: StateTransitionStoreSchema = {
      hash,
      signature: null,
      signaturePublicKeyId: null,
      status: StateTransitionStatus.pending,
      unsigned: base64
    }

    const stateTransitionsStoreSchema = await storage.get(storageKey) as StateTransitionStoreSchema

    expect(stateTransitionsStoreSchema[hash]).toStrictEqual(expectedStateTransition)

    expect(response.stateTransition.hash).toBe(hash)
    expect(response.stateTransition.status).toBe(StateTransitionStatus.pending)
    expect(response.redirectUrl).toBe('fake_url')
  })
})
