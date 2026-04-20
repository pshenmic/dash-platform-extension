import { ApproveAppConnectHandler } from '../../../../src/content-script/api/private/appConnect/approveAppConnect'
import { AppConnectRepository } from '../../../../src/content-script/repository/AppConnectRepository'
import { MemoryStorageAdapter } from '../../../../src/content-script/storage/memoryStorageAdapter'
import runMigrations from '../../../../src/content-script/storage/runMigrations'
import { AppConnectsStorageSchema } from '../../../../src/content-script/storage/storageSchema'
import hash from 'hash.js'

const buildEvent = (url: string): any => ({
  id: 'evt',
  context: 'dash-platform-extension',
  method: 'approveAppConnect',
  payload: { url },
  type: 'request'
})

describe('ApproveAppConnectHandler', () => {
  const url = 'https://example.com'
  const id = hash.sha256().update(url).digest('hex').substring(0, 6)
  const walletId = 'test-wallet-id'
  const storageKey = `appConnects_testnet_${walletId}`

  let storage: MemoryStorageAdapter
  let handler: ApproveAppConnectHandler

  beforeEach(async () => {
    storage = new MemoryStorageAdapter()
    await runMigrations(storage)

    await storage.set('network', 'testnet')
    await storage.set('currentWalletId', walletId)
    await storage.remove(storageKey)

    const appConnectRepository = new AppConnectRepository(storage)
    handler = new ApproveAppConnectHandler(appConnectRepository)
  })

  test('should write AppConnect record to storage', async () => {
    const response = await handler.handle(buildEvent(url))

    expect(response).toEqual({})

    const stored = (await storage.get(storageKey)) as AppConnectsStorageSchema
    expect(stored[id]).toBeDefined()
    expect(stored[id].url).toBe(url)
  })

  test('should be idempotent on re-approve (overwrites existing)', async () => {
    await handler.handle(buildEvent(url))
    await handler.handle(buildEvent(url))

    const stored = (await storage.get(storageKey)) as AppConnectsStorageSchema
    expect(Object.keys(stored)).toHaveLength(1)
  })

  test('should reject when url is missing', () => {
    const validation = handler.validatePayload({} as any)
    expect(validation).toBe('url is required')
  })

  test('should reject invalid URL format', () => {
    const validation = handler.validatePayload({ url: 'not a url' })
    expect(validation).toBe('Invalid URL format')
  })

  test('should reject non-http(s) protocol', () => {
    const validation = handler.validatePayload({ url: 'ftp://example.com' })
    expect(validation).toBe('Bad protocol')
  })

  test('should reject bad origin', () => {
    const validation = handler.validatePayload({ url: 'https://example.com/path' })
    expect(validation).toBe('Bad origin')
  })

  test('should accept valid https origin', () => {
    const validation = handler.validatePayload({ url: 'https://example.com' })
    expect(validation).toBeNull()
  })
})
