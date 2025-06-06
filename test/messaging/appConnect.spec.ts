import {MessagingBackend} from "../../src/content-script/MessagingBackend";
import DashPlatformSDK from 'dash-platform-sdk'
import {MessagingAPI} from "../../src/types/MessagingAPI";
import {MemoryStorageAdapter} from "../../src/content-script/storage/memoryStorageAdapter";
import {PayloadNotValidError} from "../../src/content-script/errors/PayloadNotValidError";

describe('appConnect tests', () => {
    let messagingBackend: MessagingBackend
    let messagingAPI: MessagingAPI

    beforeAll(()=> {
        const sdk = new DashPlatformSDK()
        const memoryStorageAdapter = new MemoryStorageAdapter()

        messagingBackend = new MessagingBackend(sdk.wasm, memoryStorageAdapter)
        messagingAPI = new MessagingAPI()

        messagingBackend.init()
    })

    describe('connectApp', () => {
        describe('should create app connect', () => {
            test('should create AppConnect with domain', async () => {
                const url = 'https://google.com'
                const response = await messagingAPI.connectApp(url)

                expect(response.redirectUrl).toBe('fake_id')
                expect(!!response.appConnect.id).toBeTruthy()
                expect(response.appConnect.url).toBe(url)
                expect(response.appConnect.status).toBe('pending')
            });
            test('should create AppConnect with domain with port', async () => {
                const url = 'https://google.com:8080'
                const response = await messagingAPI.connectApp(url)

                expect(response.redirectUrl).toBe('fake_id')
                expect(!!response.appConnect.id).toBeTruthy()
                expect(response.appConnect.url).toBe(url)
                expect(response.appConnect.status).toBe('pending')
            });

            test('should create AppConnect with ipv4 with port', async () => {
                const url = 'http://127.0.0.1:8080'
                const response = await messagingAPI.connectApp(url)

                expect(response.redirectUrl).toBe('fake_id')
                expect(!!response.appConnect.id).toBeTruthy()
                expect(response.appConnect.url).toBe(url)
                expect(response.appConnect.status).toBe('pending')
            });


            test('should create AppConnect with ipv4 without port', async () => {
                const url = 'http://127.0.0.1'
                const response = await messagingAPI.connectApp(url)

                expect(response.redirectUrl).toBe('fake_id')
                expect(!!response.appConnect.id).toBeTruthy()
                expect(response.appConnect.url).toBe(url)
                expect(response.appConnect.status).toBe('pending')
            });

            test('should create AppConnect with localhost', async () => {
                const url = 'http://localhost:8080'
                const response = await messagingAPI.connectApp(url)

                expect(response.redirectUrl).toBe('fake_id')
                expect(!!response.appConnect.id).toBeTruthy()
                expect(response.appConnect.url).toBe(url)
                expect(response.appConnect.status).toBe('pending')
            });

            test('should create AppConnect with localhost without port', async () => {
                const url = 'http://localhost'
                const response = await messagingAPI.connectApp(url)

                expect(response.redirectUrl).toBe('fake_id')
                expect(!!response.appConnect.id).toBeTruthy()
                expect(response.appConnect.url).toBe(url)
                expect(response.appConnect.status).toBe('pending')
            });

        })

        describe('should fail if payload not valid', () => {
            test('payload is empty', async () => {
                const url = ''

                try {
                    const response = await messagingAPI.connectApp(url)

                    throw new Error('Call should have been failed')
                } catch (e) {
                    expect(e).toBeInstanceOf(PayloadNotValidError)
                }
            });

            test('payload is a junk', async () => {
                const url = 'asdasdsadas'

                try {
                    const response = await messagingAPI.connectApp(url)

                    throw new Error('Call should have been failed')
                } catch (e) {
                    expect(e).toBeInstanceOf(PayloadNotValidError)
                }
            });

            test('payload is a ipv6 (not supported yet)', async () => {
                const url = 'http://2001:0000:130F:0000:0000:09C0:876A:130B:8080'

                try {
                    const response = await messagingAPI.connectApp(url)

                    throw new Error('Call should have been failed')
                } catch (e) {
                    expect(e).toBeInstanceOf(PayloadNotValidError)
                }
            });
        })
    })

    // describe('getAppConnect', () => {
    //     test('should retrieve AppConnect by id', async () => {
    //         const response = await messagingAPI.connectApp('https://localhost:8080')
    //
    //         console.log(response)
    //     });
    //
    //     test('should fail if payload not valid', async () => {
    //         const response = await messagingAPI.connectApp('https://localhost:8080')
    //
    //         console.log(response)
    //     });
    //
    //     test('should fail if app connect not found', async () => {
    //         const response = await messagingAPI.connectApp('https://localhost:8080')
    //
    //         console.log(response)
    //     });
    // })

})
