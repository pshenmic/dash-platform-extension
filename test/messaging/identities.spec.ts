import {MessagingBackend} from "../../src/content-script/MessagingBackend";
import DashPlatformSDK from 'dash-platform-sdk'
import {MessagingAPI} from "../../src/types/MessagingAPI";
import {MemoryStorageAdapter} from "../../src/content-script/storage/memoryStorageAdapter";

describe('identity requests tests', () => {
    let messagingBackend: MessagingBackend
    let messagingAPI: MessagingAPI

    beforeAll(()=> {
        const sdk = new DashPlatformSDK()
        const memoryStorageAdapter = new MemoryStorageAdapter()

        messagingBackend = new MessagingBackend(sdk.wasm, memoryStorageAdapter)
        messagingAPI = new MessagingAPI()

        messagingBackend.init()
    })

    describe('getCurrentIdentity', () => {
        test('should retrieve current identity', async () => {
            const response = await messagingAPI.connectApp('https://localhost:8080')

            console.log(response)
        });

        test('should fail if payload not valid', async () => {
            const response = await messagingAPI.connectApp('https://localhost:8080')

            console.log(response)
        });

        test('should fail if current identity is not set', async () => {
            const response = await messagingAPI.connectApp('https://localhost:8080')

            console.log(response)
        });
    })

    describe('getIdentities', () => {
        test('should retrieve identities list', async () => {
            const response = await messagingAPI.connectApp('https://localhost:8080')

            console.log(response)
        });

        test('should fail if payload not valid', async () => {
            const response = await messagingAPI.connectApp('https://localhost:8080')

            console.log(response)
        });

        test('should return empty list if no identities stored yet', async () => {
            const response = await messagingAPI.connectApp('https://localhost:8080')

            console.log(response)
        });
    })
})
