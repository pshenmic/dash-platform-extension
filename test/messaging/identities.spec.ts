import {MessagingBackend} from "../../src/content-script/MessagingBackend";
import DashPlatformSDK from 'dash-platform-sdk'
import {MessagingAPI} from "../../src/types/MessagingAPI";
import {MemoryStorageAdapter} from "../../src/content-script/storage/memoryStorageAdapter";
import {PayloadNotValidError} from "../../src/content-script/errors/PayloadNotValidError";
import {IdentityAlreadyExistsError} from "../../src/content-script/errors/IdentityAlreadyExistsError";
import {StorageAdapter} from "../../src/content-script/storage/storageAdapter";
import {CurrentIdentityNotSetError} from "../../src/content-script/errors/CurrentIdentityNotSetError";


describe('identity requests tests', () => {
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

    describe('importIdentity', () => {
        test('should import identity', async () => {
            const storageKey = `testnet_1_identities`
            await storage.set(storageKey, {})

            const identifier = 'HzHXSQcBkU9Ve5YAxhGd8NgA72xFcG9nCZKKxhayn1NW'
            const privateKeys = ['b16c7c2079b0c154988c5ef5aaa0cb1c2117c4253fdf60dfed3107036104d55a']

            await messagingAPI.importIdentity(identifier, privateKeys)
        });

        test('should fail if such identity already exists', async () => {
            const identifier = 'HzHXSQcBkU9Ve5YAxhGd8NgA72xFcG9nCZKKxhayn1NW'
            const privateKeys = ['b16c7c2079b0c154988c5ef5aaa0cb1c2117c4253fdf60dfed3107036104d55a']

            const storageKey = `testnet_1_identities`
            await storage.set(storageKey, {
                ['HzHXSQcBkU9Ve5YAxhGd8NgA72xFcG9nCZKKxhayn1NW']: {
                    identifier,
                    privateKeys
                }})


            try {
                await messagingAPI.importIdentity(identifier, privateKeys)

                throw new Error('Call should have been failed')
            } catch (e) {
                expect(e).toBeInstanceOf(IdentityAlreadyExistsError)
            }
        });

        describe('should fail if payload not valid', () => {
            test('identifier not valid', async () => {
                const identifier = 'deadbeef'
                const privateKeys = ['b16c7c2079b0c154988c5ef5aaa0cb1c2117c4253fdf60dfed3107036104d55a']

                try {
                    await messagingAPI.importIdentity(identifier, privateKeys)

                    throw new Error('Call should have been failed')
                } catch (e) {
                    expect(e).toBeInstanceOf(PayloadNotValidError)
                }
            });

            test('private keys are bad', async () => {
                const identifier = 'deadbeef'
                const privateKeys = null

                try {
                    await messagingAPI.importIdentity(identifier, privateKeys)

                    throw new Error('Call should have been failed')
                } catch (e) {
                    expect(e).toBeInstanceOf(PayloadNotValidError)
                }
            });

            test('private keys not hex', async () => {
                const identifier = 'deadbeef'
                const privateKeys = ['not hex']

                try {
                    await messagingAPI.importIdentity(identifier, privateKeys)

                    throw new Error('Call should have been failed')
                } catch (e) {
                    expect(e).toBeInstanceOf(PayloadNotValidError)
                }
            });

            test('private keys are empty', async () => {
                const identifier = 'deadbeef'
                const privateKeys = []

                await messagingAPI.importIdentity(identifier, privateKeys)
            });

        })
    })

    describe('getCurrentIdentity', () => {
        test('should retrieve current identity', async () => {
            const identifier = 'HzHXSQcBkU9Ve5YAxhGd8NgA72xFcG9nCZKKxhayn1NW'

            const storageKey = `testnet_1_identities_currentIdentity`
            await storage.set(storageKey, {currentIdentity: identifier})

            const identifierWASM = await messagingAPI.getCurrentIdentity()

            expect(identifierWASM.base58()).toBe(identifier)
        });

        test('should fail if current identity is not set', async () => {
            const storageKey = `testnet_1_identities_currentIdentity`
            await storage.set(storageKey, {})

            try {
                await messagingAPI.getCurrentIdentity()

                throw new Error('Call should have been failed')
            } catch (e) {
                expect(e).toBeInstanceOf(CurrentIdentityNotSetError)
            }
        });
    })

    describe('getAvailableIdentities', () => {
        test('should retrieve identities list', async () => {
            const identifier = 'HzHXSQcBkU9Ve5YAxhGd8NgA72xFcG9nCZKKxhayn1NW'
            const privateKeys = ['b16c7c2079b0c154988c5ef5aaa0cb1c2117c4253fdf60dfed3107036104d55a']

            const storageKey = `testnet_1_identities`
            await storage.set(storageKey, {
                [identifier]: {
                    identifier,
                    privateKeys
                }
            })

            const identities = await messagingAPI.getAvailableIdentities()

            expect(identities.length).toBe(1)
            expect(identities[0].base58()).toBe(identifier)
        });

        test('should return empty list if no identities stored yet', async () => {
            const storageKey = `testnet_1_identities`
            await storage.set(storageKey, {})

            const identities = await messagingAPI.getAvailableIdentities()

            expect(identities.length).toBe(0)
        });
    })
})
