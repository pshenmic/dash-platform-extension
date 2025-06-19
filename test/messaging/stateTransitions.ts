// import {MessagingBackend} from "../../src/content-script/MessagingBackend";
// import DashPlatformSDK from 'dash-platform-sdk'
// import {MessagingAPI} from "../../src/types/MessagingAPI";
// import {MemoryStorageAdapter} from "../../src/content-script/storage/memoryStorageAdapter";
// import {StorageAdapter} from "../../src/content-script/storage/storageAdapter";
// import {StateTransitionStatus} from "../../src/types/enums/StateTransitionStatus";
// import {PayloadNotValidError} from "../../src/content-script/errors/PayloadNotValidError";
// import {StateTransition} from "../../src/types/StateTransition";
// import {StateTransitionAlreadyExistsError} from "../../src/content-script/errors/StateTransitionAlreadyExistsError";
//
// describe.skip('state transitions requests tests', () => {
//     let messagingBackend: MessagingBackend
//     let messagingAPI: MessagingAPI
//     let storage: StorageAdapter
//
//     beforeAll(()=> {
//         const sdk = new DashPlatformSDK()
//         const memoryStorageAdapter = new MemoryStorageAdapter()
//
//         messagingBackend = new MessagingBackend(sdk.wasm, memoryStorageAdapter)
//         messagingAPI = new MessagingAPI()
//         storage = memoryStorageAdapter
//
//         messagingBackend.init()
//     })
//
//     describe('requestStateTransitionApproval', () => {
//         test('should store a state transition', async () => {
//             const base64 = 'AgHow50ZMBRg3NLhpHGheMKw37zyCy92h8Xq/nLmPO//pQEAAAABvzVamEjVJ8WrY12CGPD5XiHDuHOZMID4Pfa41Ta94IcCCHByZW9yZGVyMBbSwI1eE/eONjiHIhnkx+/9c1Mhk7cvBpAEum0ImpgADATOA1kQuI5q2LWL0Ic7rGgpyNMU9QZCztA+G+s1X6IBEHNhbHRlZERvbWFpbkhhc2gKIAH1lwDd9WSSQkMSnw9Vg9GmspbyKUizcTPCxtb0hLWEAAAEQR8BWHxKinHTht4HW4kOaX/C72FxmHCabQpB/d+JLanxbg1tYjOtQjZuMCmm+YD0aODuYIh15zZmmCKm8DFAnAr5'
//             const hash = '966886ae1b14630e5cce6d3200af9c0230fc47ee0e661ff7b7a2a6e7b877b740'
//
//             const storageKey = `testnet_1_stateTransitions`
//             await storage.set(storageKey, {})
//
//             const response = await messagingAPI.requestStateTransitionApproval(base64)
//
//             expect(response.hash).toBe(hash)
//             expect(response.redirectUrl).toBe('fake_url')
//         });
//
//         test('should fail if payload not valid', async () => {
//             const base64 = '123'
//
//             const storageKey = `testnet_1_stateTransitions`
//             await storage.set(storageKey, {})
//
//             try {
//                 await messagingAPI.requestStateTransitionApproval(base64)
//
//                 throw new Error('Call should have been failed')
//             } catch (e) {
//                 expect(e).toBeInstanceOf(PayloadNotValidError)
//             }
//         });
//
//         test('should fail if such state transition already there', async () => {
//             const base64 = 'AgHow50ZMBRg3NLhpHGheMKw37zyCy92h8Xq/nLmPO//pQEAAAABvzVamEjVJ8WrY12CGPD5XiHDuHOZMID4Pfa41Ta94IcCCHByZW9yZGVyMBbSwI1eE/eONjiHIhnkx+/9c1Mhk7cvBpAEum0ImpgADATOA1kQuI5q2LWL0Ic7rGgpyNMU9QZCztA+G+s1X6IBEHNhbHRlZERvbWFpbkhhc2gKIAH1lwDd9WSSQkMSnw9Vg9GmspbyKUizcTPCxtb0hLWEAAAEQR8BWHxKinHTht4HW4kOaX/C72FxmHCabQpB/d+JLanxbg1tYjOtQjZuMCmm+YD0aODuYIh15zZmmCKm8DFAnAr5'
//             const hash = '966886ae1b14630e5cce6d3200af9c0230fc47ee0e661ff7b7a2a6e7b877b740'
//
//             const stateTransition: StateTransition = {
//                 hash,
//                 status: StateTransitionStatus.pending,
//                 unsigned: base64
//             }
//
//             const storageKey = `testnet_1_stateTransitions`
//             await storage.set(storageKey, {
//                 [hash]: stateTransition
//             })
//
//             try {
//                 await messagingAPI.requestStateTransitionApproval(base64)
//
//                 throw new Error('Call should have been failed')
//             } catch (e) {
//                 expect(e).toBeInstanceOf(StateTransitionAlreadyExistsError)
//             }
//         });
//     })
//
//     describe('approveStateTransition', () => {
//         test('should approve state transition and mark it as approved', async () => {
//             const base64 = 'AgHow50ZMBRg3NLhpHGheMKw37zyCy92h8Xq/nLmPO//pQEAAAABvzVamEjVJ8WrY12CGPD5XiHDuHOZMID4Pfa41Ta94IcCCHByZW9yZGVyMBbSwI1eE/eONjiHIhnkx+/9c1Mhk7cvBpAEum0ImpgADATOA1kQuI5q2LWL0Ic7rGgpyNMU9QZCztA+G+s1X6IBEHNhbHRlZERvbWFpbkhhc2gKIAH1lwDd9WSSQkMSnw9Vg9GmspbyKUizcTPCxtb0hLWEAAAEQR8BWHxKinHTht4HW4kOaX/C72FxmHCabQpB/d+JLanxbg1tYjOtQjZuMCmm+YD0aODuYIh15zZmmCKm8DFAnAr5'
//             const hash = '966886ae1b14630e5cce6d3200af9c0230fc47ee0e661ff7b7a2a6e7b877b740'
//
//             const stateTransition: StateTransition = {
//                 hash,
//                 status: StateTransitionStatus.pending,
//                 unsigned: base64
//             }
//
//             const storageKey = `testnet_1_stateTransitions`
//             await storage.set(storageKey, {
//                 [hash]: stateTransition
//             })
//
//             // todo
//
//         });
//
//         test('should fail if payload is not valid', async () => {
//             const response = await messagingAPI.connectApp('https://localhost:8080')
//
//             console.log(response)
//         });
//
//         test('should fail if identity not found', async () => {
//             const response = await messagingAPI.connectApp('https://localhost:8080')
//
//             console.log(response)
//         });
//
//         test('should fail if matching private key for identity not found', async () => {
//             const response = await messagingAPI.connectApp('https://localhost:8080')
//
//             console.log(response)
//         });
//     })
//
//     describe('getStateTransition', () => {
//         test('should retrieve state transition', async () => {
//             const response = await messagingAPI.connectApp('https://localhost:8080')
//
//             console.log(response)
//         });
//
//         test('should fail if payload not valid', async () => {
//             const response = await messagingAPI.connectApp('https://localhost:8080')
//
//             console.log(response)
//         });
//
//         test('should fail if state transition was not found', async () => {
//             const response = await messagingAPI.connectApp('https://localhost:8080')
//
//             console.log(response)
//         });
//     })
//
//     describe('rejectStateTransition', () => {
//         test('should reject state transition', async () => {
//             const response = await messagingAPI.connectApp('https://localhost:8080')
//
//             console.log(response)
//         });
//
//         test('should fail if payload not valid', async () => {
//             const response = await messagingAPI.connectApp('https://localhost:8080')
//
//             console.log(response)
//         });
//
//         test('should fail if state transition was not found', async () => {
//             const response = await messagingAPI.connectApp('https://localhost:8080')
//
//             console.log(response)
//         });
//     })
// })
