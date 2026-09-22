import { StorageAdapter } from '../../src/content-script/storage/storageAdapter'

// Round-trip JSON, like extension storage: a failed write must not mutate a
// previous record through a shared object reference.
export class IsolatedStorage implements StorageAdapter {
  entries: Record<string, object | number | string | null> = {}
  async getAll (): Promise<object> { return JSON.parse(JSON.stringify(this.entries)) }
  async get (key: string): Promise<object | number | string | null> { return JSON.parse(JSON.stringify(this.entries[key] ?? null)) }
  async set (key: string, value: object | number | string | null): Promise<void> { this.entries[key] = JSON.parse(JSON.stringify(value)) }
  async remove (key: string): Promise<void> { Reflect.deleteProperty(this.entries, key) }
}

export const installWebLocks = (): (() => void) => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  const queues = new Map<string, Promise<unknown>>()
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      locks: {
        request: async (name: string, callback: () => Promise<unknown>) => {
          const result = (queues.get(name) ?? Promise.resolve()).catch(() => {}).then(callback)
          queues.set(name, result)
          return await result
        }
      }
    }
  })
  return () => {
    if (descriptor != null) Object.defineProperty(globalThis, 'navigator', descriptor)
    else Reflect.deleteProperty(globalThis, 'navigator')
  }
}
