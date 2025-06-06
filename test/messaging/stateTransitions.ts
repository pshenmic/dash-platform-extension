import {MessagingBackend} from "../../src/content-script/MessagingBackend";
import DashPlatformSDK from 'dash-platform-sdk'
import {MessagingAPI} from "../../src/types/MessagingAPI";
import {MemoryStorageAdapter} from "../../src/content-script/storage/memoryStorageAdapter";
import {StorageAdapter} from "../../src/content-script/storage/storageAdapter";

describe('state transitions requests tests', () => {
    let messagingBackend: MessagingBackend
    let messagingAPI: MessagingAPI
    let storage: StorageAdapter

    beforeAll(()=> {
        const sdk = new DashPlatformSDK()
        const memoryStorageAdapter = new MemoryStorageAdapter()

        messagingBackend = new MessagingBackend(sdk.wasm, memoryStorageAdapter)
        messagingAPI = new MessagingAPI()
        storage = memoryStorageAdapter

        messagingBackend.init()
    })

    describe('requestStateTransitionApproval', () => {
        test('should store a state transition', async () => {

            const base64 = 'AgHow50ZMBRg3NLhpHGheMKw37zyCy92h8Xq/nLmPO//pQEAAAABvzVamEjVJ8WrY12CGPD5XiHDuHOZMID4Pfa41Ta94IcCCHByZW9yZGVyMBbSwI1eE/eONjiHIhnkx+/9c1Mhk7cvBpAEum0ImpgADATOA1kQuI5q2LWL0Ic7rGgpyNMU9QZCztA+G+s1X6IBEHNhbHRlZERvbWFpbkhhc2gKIAH1lwDd9WSSQkMSnw9Vg9GmspbyKUizcTPCxtb0hLWEAAAEQR8BWHxKinHTht4HW4kOaX/C72FxmHCabQpB/d+JLanxbg1tYjOtQjZuMCmm+YD0aODuYIh15zZmmCKm8DFAnAr5'
            const storageKey = `testnet_1_stateTransitions`
            await storage.set(storageKey, {})

            const response = await messagingAPI.requestStateTransitionApproval(base64)

            expect()
        });

        test('should fail if payload not valid', async () => {
            const response = await messagingAPI.connectApp('https://localhost:8080')

            console.log(response)
        });

        test('should fail if such state transition already there', async () => {
            const response = await messagingAPI.connectApp('https://localhost:8080')

            console.log(response)
        });
    })

    describe('approveStateTransition', () => {
        test('should approve state transition and mark it as approved', async () => {
            const response = await messagingAPI.connectApp('https://localhost:8080')

            console.log(response)
        });

        test('should fail if payload is not valid', async () => {
            const response = await messagingAPI.connectApp('https://localhost:8080')

            console.log(response)
        });

        test('should fail if identity not found', async () => {
            const response = await messagingAPI.connectApp('https://localhost:8080')

            console.log(response)
        });

        test('should fail if matching private key for identity not found', async () => {
            const response = await messagingAPI.connectApp('https://localhost:8080')

            console.log(response)
        });
    })

    describe('getStateTransition', () => {
        test('should retrieve state transition', async () => {
            const response = await messagingAPI.connectApp('https://localhost:8080')

            console.log(response)
        });

        test('should fail if payload not valid', async () => {
            const response = await messagingAPI.connectApp('https://localhost:8080')

            console.log(response)
        });

        test('should fail if state transition was not found', async () => {
            const response = await messagingAPI.connectApp('https://localhost:8080')

            console.log(response)
        });
    })

    describe('rejectStateTransition', () => {
        test('should reject state transition', async () => {
            const response = await messagingAPI.connectApp('https://localhost:8080')

            console.log(response)
        });

        test('should fail if payload not valid', async () => {
            const response = await messagingAPI.connectApp('https://localhost:8080')

            console.log(response)
        });

        test('should fail if state transition was not found', async () => {
            const response = await messagingAPI.connectApp('https://localhost:8080')

            console.log(response)
        });
    })
})
