import {MessagingBackend} from "../../src/content-script/MessagingBackend";
import DashPlatformSDK from 'dash-platform-sdk'
import {MessagingAPI} from "../../src/types/MessagingAPI";
import {MemoryStorageAdapter} from "../../src/content-script/storage/memoryStorageAdapter";

describe('state transitions requests tests', () => {
    let messagingBackend: MessagingBackend
    let messagingAPI: MessagingAPI

    beforeAll(()=> {
        const sdk = new DashPlatformSDK()
        const memoryStorageAdapter = new MemoryStorageAdapter()

        messagingBackend = new MessagingBackend(sdk.wasm, memoryStorageAdapter)
        messagingAPI = new MessagingAPI()

        messagingBackend.init()
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

    describe('requestStateTransitionApproval', () => {
        test('should store a state transition', async () => {
            const response = await messagingAPI.connectApp('https://localhost:8080')

            console.log(response)
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
})
