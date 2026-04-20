import { DashPlatformSDK } from 'dash-platform-sdk'
import { ConnectAppHandler } from '../../../src/content-script/api/public/connectApp'
import { AppConnectRepository } from '../../../src/content-script/repository/AppConnectRepository'
import { IdentitiesRepository } from '../../../src/content-script/repository/IdentitiesRepository'
import { WalletRepository } from '../../../src/content-script/repository/WalletRepository'
import { MemoryStorageAdapter } from '../../../src/content-script/storage/memoryStorageAdapter'
import runMigrations from '../../../src/content-script/storage/runMigrations'
import { AppConnectsStorageSchema } from '../../../src/content-script/storage/storageSchema'
import { WalletType } from '../../../src/types'
import hash from 'hash.js'

const buildEvent = (): any => ({
  id: 'evt',
  context: 'dash-platform-extension',
  method: 'connectApp',
  payload: { url: 'https://example.com' },
  type: 'request'
})

describe('ConnectAppHandler', () => {
  const url = 'https://example.com'
  const id = hash.sha256().update(url).digest('hex').substring(0, 6)
  const walletId = 'test-wallet-id'
  const storageKey = `appConnects_testnet_${walletId}`

  let storage: MemoryStorageAdapter
  let handler: ConnectAppHandler

  beforeEach(async () => {
    storage = new MemoryStorageAdapter()
    await runMigrations(storage)

    await storage.set('network', 'testnet')
    await storage.set('currentWalletId', walletId)
    await storage.set(`wallet_testnet_${walletId}`, {
      walletId,
      type: WalletType.keystore,
      label: 'test',
      encryptedMnemonic: '',
      seedHash: '',
      currentIdentity: null
    })
    await storage.remove(storageKey)

    const sdk = new DashPlatformSDK({ network: 'testnet' })
    const appConnectRepository = new AppConnectRepository(storage)
    const identitiesRepository = new IdentitiesRepository(storage, sdk)
    const walletRepository = new WalletRepository(storage, identitiesRepository)

    handler = new ConnectAppHandler(appConnectRepository, identitiesRepository, walletRepository, storage)

    // chrome.storage.onChanged mock so handler can register without error
    ;(global as any).chrome = {
      runtime: { getURL: (p: string) => `chrome-extension://test/${p}` },
      storage: {
        onChanged: {
          _listeners: [] as Array<(changes: any, area: string) => void>,
          addListener (fn: any) { this._listeners.push(fn) },
          removeListener (fn: any) {
            const i = this._listeners.indexOf(fn)
            if (i >= 0) this._listeners.splice(i, 1)
          }
        }
      }
    }
    ;(global as any).window.open = jest.fn(() => ({ closed: false }))
  })

  test('should return walletInfo immediately when app is already connected', async () => {
    await storage.set(storageKey, {
      [id]: { id, url }
    } satisfies AppConnectsStorageSchema)

    const response = await handler.handle(buildEvent())

    expect(response.network).toBe('testnet')
    expect(response.identities).toBeDefined()
  })

  test('should resolve when storage change adds the approved record', async () => {
    const pendingPromise = handler.handle(buildEvent())

    // simulate popup writing the record and storage.onChanged firing
    setImmediate(() => {
      const newRecord = { [id]: { id, url } }
      void storage.set(storageKey, newRecord).then(() => {
        const listeners = ((global as any).chrome.storage.onChanged)._listeners as Array<(changes: any, area: string) => void>
        for (const fn of listeners) {
          fn({ [storageKey]: { newValue: newRecord } }, 'local')
        }
      })
    })

    const response = await pendingPromise
    expect(response.network).toBe('testnet')
  })

  test('should reject when popup is closed without record created', async () => {
    const closedPopup = { closed: false }
    ;(global as any).window.open = jest.fn(() => closedPopup)

    const pendingPromise = handler.handle(buildEvent())

    // simulate user closing popup (no storage write)
    setTimeout(() => { closedPopup.closed = true }, 50)

    await expect(pendingPromise).rejects.toThrow('App connection was rejected')
  })
})
