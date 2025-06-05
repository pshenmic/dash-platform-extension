import {MessagingBackend} from "../../src/content-script/MessagingBackend";
import DashPlatformSDK from 'dash-platform-sdk'
import {MessagingAPI} from "../../src/types/MessagingAPI";
import {MemoryStorageAdapter} from "../../src/content-script/storage/memoryStorageAdapter";

describe('appConnect', () => {
    let messagingBackend: MessagingBackend
    let messagingAPI: MessagingAPI

    beforeAll(()=> {
        const sdk = new DashPlatformSDK()
        const memoryStorageAdapter = new MemoryStorageAdapter()

        messagingBackend = new MessagingBackend(sdk.wasm, memoryStorageAdapter)
        messagingAPI = new MessagingAPI()

        messagingBackend.init()
    })

    test('create', async () => {
        const response = await messagingAPI.connectApp('https://localhost:8080')

        console.log(response)
    });
})
