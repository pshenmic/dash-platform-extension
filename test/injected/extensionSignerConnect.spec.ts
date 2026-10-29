import { ExtensionSigner } from '../../src/injected/ExtensionSigner'
import { popupWindow } from '../../src/utils'

jest.mock('../../src/utils', () => {
  const actual = jest.requireActual('../../src/utils')
  return {
    ...actual,
    popupWindow: jest.fn(),
    wait: jest.fn(async () => {})
  }
})

const popupWindowMock = popupWindow as jest.MockedFunction<typeof popupWindow>

const pending = { status: 'pending', redirectUrl: 'chrome-extension://id/index.html#/connect/abc123', identities: [], currentIdentity: null, network: null }
const approved = { status: 'approved', redirectUrl: '', identities: [{ identifier: 'A' }], currentIdentity: 'A', network: 'testnet' }
const rejected = { status: 'rejected', redirectUrl: '', identities: [], currentIdentity: null, network: null }

describe('connect() on the page', () => {
  let client: any

  beforeEach(() => {
    jest.clearAllMocks()
    Object.assign(global, { window: { location: { origin: 'https://shop.example' } } })

    client = {
      connectApp: jest.fn(),
      openRequestPopup: jest.fn(async () => ({ opened: true }))
    }
  })

  afterEach(() => {
    Reflect.deleteProperty(global, 'window')
  })

  it('asks the extension to show the request in its toolbar popup and waits for the answer', async () => {
    client.connectApp.mockResolvedValueOnce(pending).mockResolvedValueOnce(pending).mockResolvedValueOnce(approved)

    await expect(new ExtensionSigner(client).connect()).resolves.toEqual({ currentIdentity: 'A', identities: [{ identifier: 'A' }] })
    expect(client.openRequestPopup).toHaveBeenCalledWith({ kind: 'connect' })
    expect(popupWindowMock).not.toHaveBeenCalled()
    // Every call after the first one waits on the same request.
    expect(client.connectApp.mock.calls).toEqual([
      ['https://shop.example'],
      ['https://shop.example', true],
      ['https://shop.example', true]
    ])
  })

  it('rejects when the user closes the popup undecided', async () => {
    client.connectApp.mockResolvedValueOnce(pending).mockResolvedValueOnce(rejected)

    await expect(new ExtensionSigner(client).connect()).rejects.toThrow('App connection was rejected')
  })

  it('opens a window of its own where the popup cannot be opened', async () => {
    client.openRequestPopup.mockResolvedValueOnce({ opened: false })
    popupWindowMock.mockReturnValue({ closed: true } as any)
    client.connectApp.mockResolvedValueOnce(pending).mockResolvedValueOnce(pending)

    await expect(new ExtensionSigner(client).connect()).rejects.toThrow('App connection was rejected')
    expect(popupWindowMock).toHaveBeenCalledWith(pending.redirectUrl, 'connectApp', expect.anything(), 430, 600)
  })

  it('opens nothing for a website already connected', async () => {
    client.connectApp.mockResolvedValueOnce(approved)

    await new ExtensionSigner(client).connect()

    expect(client.openRequestPopup).not.toHaveBeenCalled()
  })
})
