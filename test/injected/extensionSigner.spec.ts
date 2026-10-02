import { DashPlatformSDK } from 'dash-platform-sdk'
import { ExtensionSigner } from '../../src/injected/ExtensionSigner'
import { PageEventName } from '../../src/types/PageState'
import { popupWindow } from '../../src/utils'

jest.mock('../../src/utils', () => ({
  ...jest.requireActual('../../src/utils'),
  popupWindow: jest.fn()
}))

const popupWindowMock = popupWindow as jest.MockedFunction<typeof popupWindow>

// A page that uses the signer waits for the extension to say the user answered,
// instead of asking it again twice a second.
describe('ExtensionSigner', () => {
  const identityId = 'HT3pUBM1Uv2mKgdPEN1gxa7A4PdsvNY89aJbdSKQb5wR'

  let listeners: Record<string, Array<(payload: any) => void>>
  let pageEvents: any
  let client: any
  let popup: { closed: boolean }
  let signer: ExtensionSigner

  const announce = (event: PageEventName, payload: object): void => {
    for (const listener of listeners[event] ?? []) {
      listener(payload)
    }
  }

  const settle = async (): Promise<void> => { await new Promise(resolve => setTimeout(resolve, 10)) }

  beforeEach(() => {
    // The bootstrap's window mock has no location.
    ;(global as any).window.location = { origin: 'https://app.example.com' }

    listeners = {}
    pageEvents = {
      on: (event: string, listener: any) => { listeners[event] = [...(listeners[event] ?? []), listener] },
      off: (event: string, listener: any) => { listeners[event] = (listeners[event] ?? []).filter(entry => entry !== listener) }
    }

    popup = { closed: false }
    popupWindowMock.mockReturnValue(popup as unknown as Window)

    client = { connectApp: jest.fn(), requestTransactionApproval: jest.fn() }

    signer = new ExtensionSigner(client, pageEvents)
  })

  describe('connect', () => {
    it('returns as soon as the extension says the user approved', async () => {
      client.connectApp
        .mockResolvedValueOnce({ status: 'pending', redirectUrl: 'chrome-extension://id/index.html#/connect/100680' })
        .mockResolvedValueOnce({ status: 'approved', identities: [{ identifier: identityId }], currentIdentity: identityId })

      const connecting = signer.connect()

      await settle()
      announce(PageEventName.connectionStatusChanged, { status: 'approved' })

      expect(await connecting).toEqual({ identities: [{ identifier: identityId }], currentIdentity: identityId })
      expect(client.connectApp).toHaveBeenCalledTimes(2)
      expect(listeners[PageEventName.connectionStatusChanged]).toEqual([])
    })

    it('fails when the user closes the window without answering', async () => {
      client.connectApp.mockResolvedValue({ status: 'pending', redirectUrl: 'chrome-extension://id/index.html#/connect/100680' })

      const connecting = signer.connect()

      await settle()
      popup.closed = true

      await expect(connecting).rejects.toThrow('App connection was rejected')
    })

    it('fails on a rejection without waiting for the window to close', async () => {
      client.connectApp
        .mockResolvedValueOnce({ status: 'pending', redirectUrl: 'chrome-extension://id/index.html#/connect/100680' })
        .mockResolvedValueOnce({ status: 'rejected' })

      const connecting = signer.connect()

      await settle()
      announce(PageEventName.connectionStatusChanged, { status: 'rejected' })

      await expect(connecting).rejects.toThrow('App connection was rejected')
    })
  })

  describe('signAndBroadcast', () => {
    // injectExtension.js and injectSdk.js are separate bundles with their own
    // WASM instance, so a transition the page built is not an instance of the
    // class the signer holds.
    it('accepts a state transition built by the SDK injected next to it', async () => {
      const sdk = new DashPlatformSDK({ network: 'testnet' })
      const stateTransition = sdk.identities.createStateTransition('creditTransfer', {
        identityId,
        recipientId: identityId,
        amount: 1000n,
        identityNonce: 1n
      })

      const fromAnotherBundle = { bytes: () => stateTransition.bytes(), base64: () => stateTransition.base64() }
      const unsignedHash = stateTransition.hash(true)

      client.requestTransactionApproval
        .mockResolvedValueOnce({ stateTransition: { unsignedHash, status: 'pending' }, redirectUrl: 'chrome-extension://id/index.html#/approve/x' })
        .mockResolvedValueOnce({ stateTransition: { unsignedHash, status: 'rejected' } })

      const signing = signer.signAndBroadcast(fromAnotherBundle as any)

      await settle()
      announce(PageEventName.stateTransitionResolved, { unsignedHash, status: 'rejected' })

      await expect(signing).rejects.toThrow('Transaction signing was rejected')
    })

    it('waits for the answer to its own request and signs with it', async () => {
      const sdk = new DashPlatformSDK({ network: 'testnet' })
      const stateTransition = sdk.identities.createStateTransition('creditTransfer', {
        identityId,
        recipientId: identityId,
        amount: 1000n,
        identityNonce: 1n
      })

      const unsignedHash = stateTransition.hash(true)
      const signature = 'ab'.repeat(32)

      client.requestTransactionApproval
        .mockResolvedValueOnce({ stateTransition: { unsignedHash, status: 'pending' }, redirectUrl: 'chrome-extension://id/index.html#/approve/x' })
        .mockResolvedValueOnce({ stateTransition: { unsignedHash, status: 'approved', signature, signaturePublicKeyId: 1 } })

      const signing = signer.signAndBroadcast(stateTransition)

      await settle()
      // An answer to someone else's request does not wake this one up.
      announce(PageEventName.stateTransitionResolved, { unsignedHash: 'b'.repeat(64), status: 'approved' })
      expect(client.requestTransactionApproval).toHaveBeenCalledTimes(1)

      announce(PageEventName.stateTransitionResolved, { unsignedHash, status: 'approved' })

      const signed = await signing

      expect(signed.signaturePublicKeyId).toBe(1)
      expect(client.requestTransactionApproval).toHaveBeenCalledTimes(2)
    })
  })
})
