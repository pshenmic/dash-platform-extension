import { StorageAdapter } from './storageAdapter'

const cache = {}

export class MemoryStorageAdapter implements StorageAdapter {
  get = async (key: string): Promise<object | number | string | null> => {
    const item = cache[key]

    if (!item) {
      return null
    }

    return item
  }

  set = async (key: string, value: object | number | string | null): Promise<void> => {
    cache[key] = value
  }
}
