import { ExtensionSigner } from '../../src/injected/ExtensionSigner'
import { popupWindow } from '../../src/utils/browser'

jest.mock('../../src/utils/browser', () => ({
  ...jest.requireActual('../../src/utils/browser'),
  popupWindow: jest.fn()
}))

const popupWindowMock = popupWindow as jest.MockedFunction<typeof popupWindow>

// The page has no SDK of its own guaranteed to match what the extension
// signed, so the signer has to hand back the signed transition itself.
describe('ExtensionSigner.signAndBroadcast', () => {
  const unsignedBase64 = 'AQAAAA=='
  const signedBase64 = 'AQAAAAICAgI='
  const signedHash = 'ab'.repeat(32)

  let client: any
  let signer: ExtensionSigner

  beforeEach(() => {
    popupWindowMock.mockReturnValue(null)

    client = { connectApp: jest.fn(), requestTransactionApproval: jest.fn() }

    signer = new ExtensionSigner(client)
  })

  const resolveWith = (stateTransition: object): void => {
    client.requestTransactionApproval.mockResolvedValue({
      stateTransition,
      redirectUrl: 'chrome-extension://id/index.html#/approve/x'
    })
  }

  it('reports what the extension signed and broadcast', async () => {
    resolveWith({
      status: 'approved',
      unsignedHash: 'cd'.repeat(32),
      unsigned: unsignedBase64,
      signedHash,
      signed: signedBase64,
      signature: 'ef'.repeat(32),
      signaturePublicKeyId: 1
    })

    const result = await signer.signAndBroadcast(unsignedBase64)

    expect(result.signedHash).toBe(signedHash)
    expect(result.signedBase64).toBe(signedBase64)
    expect(result.signaturePublicKeyId).toBe(1)
    // Kept so a caller can see the transition it asked for; it is not
    // necessarily the one that went out.
    expect(result.unsignedBase64).toBe(unsignedBase64)
  })

  it('fails rather than returning an approval it cannot describe', async () => {
    resolveWith({
      status: 'approved',
      unsignedHash: 'cd'.repeat(32),
      unsigned: unsignedBase64,
      signedHash: null,
      signed: null,
      signature: 'ef'.repeat(32),
      signaturePublicKeyId: 1
    })

    await expect(signer.signAndBroadcast(unsignedBase64))
      .rejects.toThrow('did not report what it signed')
  })

  it('takes a transition as hex as well as base64', async () => {
    resolveWith({
      status: 'approved',
      unsignedHash: 'cd'.repeat(32),
      unsigned: unsignedBase64,
      signedHash,
      signed: signedBase64,
      signature: 'ef'.repeat(32),
      signaturePublicKeyId: 1
    })

    await signer.signAndBroadcast('01'.repeat(32))

    expect(client.requestTransactionApproval).toHaveBeenCalledWith(Buffer.from('01'.repeat(32), 'hex').toString('base64'))
  })
})
