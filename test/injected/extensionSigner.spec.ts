import { ExtensionSigner } from '../../src/injected/ExtensionSigner'

const approved = {
  redirectUrl: 'about:blank',
  status: 'approved',
  identities: [{ identifier: 'id-1', label: null }],
  currentIdentity: 'id-1',
  network: 'testnet'
}

const signerFor = (response: any): ExtensionSigner => {
  return new ExtensionSigner({ connectApp: jest.fn(async () => response) } as any)
}

describe('ExtensionSigner.connect', () => {
  // The bootstrap's window stands in for the page's, and connect reads the
  // origin off it to name the site asking.
  beforeAll(() => {
    ;(global as any).window = { ...(global as any).window, location: { origin: 'https://example.test' } }
  })

  it('hands the site the network the wallet is on', async () => {
    const info = await signerFor(approved).connect()

    expect(info).toEqual({
      currentIdentity: 'id-1',
      identities: [{ identifier: 'id-1', label: null }],
      network: 'testnet'
    })
  })

  it('passes the network through whatever it is', async () => {
    const info = await signerFor({ ...approved, network: 'mainnet' }).connect()

    expect(info.network).toBe('mainnet')
  })

  it('carries the granted identities, not every identity of the wallet', async () => {
    const granted = [{ identifier: 'id-2', label: null }]
    const info = await signerFor({ ...approved, identities: granted, currentIdentity: 'id-2' }).connect()

    expect(info.identities).toEqual(granted)
    expect(info.currentIdentity).toBe('id-2')
  })

  it('refuses a rejected connection', async () => {
    await expect(signerFor({ ...approved, status: 'rejected' }).connect())
      .rejects.toThrow('App connection was rejected')
  })

  it('refuses a connection that ended in an error', async () => {
    await expect(signerFor({ ...approved, status: 'error' }).connect())
      .rejects.toThrow('An error occurred while connecting app')
  })
})
