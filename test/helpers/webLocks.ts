// Web Locks for tests: the real API belongs to the browser, and node has no
// navigator at all. Serializes callbacks per lock name, like the browser does,
// so a test can still show that two syncs of one wallet do not interleave.
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
    if (descriptor != null) {
      Object.defineProperty(globalThis, 'navigator', descriptor)
    } else {
      Reflect.deleteProperty(globalThis, 'navigator')
    }
  }
}
