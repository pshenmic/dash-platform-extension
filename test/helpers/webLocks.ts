// Web Locks for tests: the real API belongs to the browser, and node has no
// navigator at all. Serializes callbacks per lock name, like the browser does,
// so a test can still show that two syncs of one wallet do not interleave. With
// `ifAvailable` a held lock is not waited for: the callback gets null, which is
// how a test shows a second confirmation of a payment is refused, not queued.
export const installWebLocks = (): (() => void) => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  const queues = new Map<string, Promise<unknown>>()
  const held = new Map<string, number>()

  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      locks: {
        request: async (name: string, ...args: any[]) => {
          type Task = (lock: { name: string } | null) => Promise<unknown>
          const [options, task]: [{ ifAvailable?: boolean }, Task] = args.length === 1 ? [{}, args[0]] : [args[0], args[1]]

          if (options.ifAvailable === true && (held.get(name) ?? 0) > 0) {
            return await task(null)
          }

          held.set(name, (held.get(name) ?? 0) + 1)

          const run = async (): Promise<unknown> => {
            try {
              return await task({ name })
            } finally {
              held.set(name, (held.get(name) as number) - 1)
            }
          }

          const result = (queues.get(name) ?? Promise.resolve()).catch(() => {}).then(run)
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
