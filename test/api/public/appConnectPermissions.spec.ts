import { DashPlatformSDK } from 'dash-platform-sdk'
import { DashCoreSDK } from 'dash-core-sdk'
import { base64 } from '@scure/base'
import hash from 'hash.js'
import { PrivateKey } from 'eciesjs'
import { PrivateAPIClient, WalletType } from '../../../src/types'
import { PrivateAPI } from '../../../src/content-script/api/PrivateAPI'
import { PublicAPI } from '../../../src/content-script/api/PublicAPI'
import { MessagingMethods } from '../../../src/types/enums/MessagingMethods'
import { MemoryStorageAdapter } from '../../../src/content-script/storage/memoryStorageAdapter'
import { StorageAdapter } from '../../../src/content-script/storage/storageAdapter'
import { AppConnectsStorageSchema } from '../../../src/content-script/storage/storageSchema'
import { AppConnectStatus } from '../../../src/types/enums/AppConnectStatus'
import runMigrations from '../../../src/content-script/storage/runMigrations'
import { connectBackend } from '../../helpers/connectBackend'

// A website sees what the user granted it and nothing else. These go through
// PublicAPI.handleMessage, the same entry point a page's postMessage reaches,
// so the authorization that sits in front of the handlers is covered too.
describe('what a connected website may see', () => {
  const origin = 'https://app.example.com'
  const identityA = 'HT3pUBM1Uv2mKgdPEN1gxa7A4PdsvNY89aJbdSKQb5wR'
  const identityB = '2HPEBQW4JgatyogjFc5KdYzAXaPAyTEG4ShYYKS7w643'

  let sdk: DashPlatformSDK
  let privateAPIClient: PrivateAPIClient
  let publicAPI: PublicAPI
  let storage: StorageAdapter
  let walletId: string
  let connectId: string

  const call = async (method: MessagingMethods, payload: object, from: string = origin): Promise<any> => {
    // Shaped like the message a page posts, which is all handleMessage reads.
    const event: any = {
      origin: from,
      data: { context: 'dash-platform-extension', id: 'id', type: 'request', method, payload }
    }

    return await publicAPI.handleMessage(event)
  }

  const connect = async (from: string = origin): Promise<any> =>
    await call(MessagingMethods.CONNECT_APP, { url: from }, from)

  beforeEach(async () => {
    sdk = new DashPlatformSDK({ network: 'testnet' })
    storage = new MemoryStorageAdapter()

    await runMigrations(storage)

    const privateAPI = new PrivateAPI(sdk, new DashCoreSDK({ network: 'testnet' }), storage)
    privateAPIClient = new PrivateAPIClient()

    connectBackend(privateAPI)

    const passwordHash = hash.sha256().update('test').digest('hex')

    await storage.set('network', 'testnet')
    await storage.set('passwordPublicKey', PrivateKey.fromHex(passwordHash).publicKey.toHex())

    const wallet = await privateAPIClient.createWallet(WalletType.keystore)
    walletId = wallet.walletId

    await storage.set('currentWalletId', walletId)

    await storage.set(`identities_testnet_${walletId}`, {
      [identityA]: { index: 0, label: null, identifier: identityA, proTxHash: null, type: 'regular' },
      [identityB]: { index: 1, label: null, identifier: identityB, proTxHash: null, type: 'regular' }
    })

    // Handlers only: the page listener would answer the private client's
    // messages too, because the test bus is shared.
    publicAPI = new PublicAPI(sdk, storage)
    publicAPI.buildHandlers()

    await connect()

    // The extension keys a connection by the hash of the origin; the test
    // bootstrap's chrome.runtime.getURL does not carry the id back.
    connectId = hash.sha256().update(origin).digest('hex').substring(0, 6)
  })

  describe('before the user approves', () => {
    it('tells the website nothing about the wallet', async () => {
      const response = await connect()

      expect(response.status).toBe(AppConnectStatus.pending)
      expect(response.identities).toEqual([])
      expect(response.currentIdentity).toBeNull()
      expect(response.network).toBeNull()
    })

    it('refuses every other method', async () => {
      await expect(call(MessagingMethods.REQUEST_STATE_TRANSITION_APPROVAL, { base64: 'AA==' }))
        .rejects.toThrow(`Application on url ${origin} is not authorized`)
    })

    it('refuses a connection requested in the name of another website', async () => {
      await expect(call(MessagingMethods.CONNECT_APP, { url: 'https://evil.example.com' }))
        .rejects.toThrow(`Connection must be requested for the calling origin ${origin}`)
    })
  })

  describe('after the user approves', () => {
    it('shows only the granted identities', async () => {
      await privateAPIClient.approveAppConnect(connectId, [identityA])

      const response = await connect()

      expect(response.status).toBe(AppConnectStatus.approved)
      expect(response.identities.map((identity: any) => identity.identifier)).toEqual([identityA])
      expect(response.currentIdentity).toBe(identityA)
      expect(response.network).toBe('testnet')
    })

    it('grants every identity of the wallet when the approval names none', async () => {
      await privateAPIClient.approveAppConnect(connectId)

      const response = await connect()

      expect(response.identities.map((identity: any) => identity.identifier)).toEqual([identityA, identityB])
    })

    it('does not name an identity the website may not see as its current one', async () => {
      await privateAPIClient.switchIdentity(identityB)
      await privateAPIClient.approveAppConnect(connectId, [identityA])

      expect((await connect()).currentIdentity).toBe(identityA)
    })

    it('stops showing an identity the user takes away', async () => {
      await privateAPIClient.approveAppConnect(connectId, [identityA, identityB])
      await privateAPIClient.setAppConnectIdentities(connectId, [identityB])

      expect((await connect()).identities.map((identity: any) => identity.identifier)).toEqual([identityB])
    })

    it('refuses a grant of an identity the wallet does not hold', async () => {
      await expect(privateAPIClient.approveAppConnect(connectId, ['Dxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx']))
        .rejects.toThrow('does not belong to this wallet')
    })
  })

  describe('signing', () => {
    const transitionOf = (identityId: string): string => base64.encode(
      sdk.identities.createStateTransition('creditTransfer', {
        identityId,
        recipientId: identityId === identityA ? identityB : identityA,
        amount: 1000n,
        identityNonce: 1n
      }).bytes()
    )

    it('refuses a state transition owned by an identity the website was not granted', async () => {
      await privateAPIClient.approveAppConnect(connectId, [identityA])

      await expect(call(MessagingMethods.REQUEST_STATE_TRANSITION_APPROVAL, { base64: transitionOf(identityB) }))
        .rejects.toThrow(`State transition owner ${identityB} is not granted to this application`)

      expect(await storage.get(`stateTransitions_testnet_${walletId}`)).toBeNull()
    })

    it('accepts one owned by a granted identity', async () => {
      await privateAPIClient.approveAppConnect(connectId, [identityA])

      const response = await call(MessagingMethods.REQUEST_STATE_TRANSITION_APPROVAL, { base64: transitionOf(identityA) })

      expect(response.stateTransition.status).toBe('pending')
      expect(response.redirectUrl).toContain(response.stateTransition.unsignedHash)
    })
  })
})

// Connections made before permissions existed carry no grant, and granting them
// everything is what the permission model exists to prevent.
describe('the permissions migration', () => {
  it('drops connections approved before permissions existed', async () => {
    const storage = new MemoryStorageAdapter()
    const appConnects: AppConnectsStorageSchema = {
      // @ts-expect-error written the way schema version 9 wrote it, without a grant
      abc123: { id: 'abc123', url: 'https://app.example.com', status: AppConnectStatus.approved }
    }

    await storage.set('schema_version', 9)
    await storage.set('wallets', ['wallet1'])
    await storage.set('wallet_testnet_wallet1', { walletId: 'wallet1', network: 'testnet', type: 'keystore', label: null, encryptedMnemonic: null, seedHash: null, currentIdentity: null })
    await storage.set('appConnects_testnet_wallet1', appConnects)

    await runMigrations(storage)

    expect(await storage.get('appConnects_testnet_wallet1')).toEqual({})
    expect(await storage.get('schema_version')).toBe(10)
  })
})
