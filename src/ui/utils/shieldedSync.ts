// Tracks shielded note syncs started by this popup, so screens can wait for them.

type Listener = () => void

let running = 0
const listeners = new Set<Listener>()

const notify = (): void => {
  listeners.forEach(listener => listener())
}

export const isShieldedSyncRunning = (): boolean => running > 0

// Subscribes to sync start and finish; returns the unsubscribe function.
export const onShieldedSyncChange = (listener: Listener): () => void => {
  listeners.add(listener)

  return () => { listeners.delete(listener) }
}

export const trackShieldedSync = async <T>(sync: Promise<T>): Promise<T> => {
  running += 1
  notify()

  try {
    return await sync
  } finally {
    running -= 1
    notify()
  }
}
