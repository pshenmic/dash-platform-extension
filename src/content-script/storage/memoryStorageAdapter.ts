import { StorageAdapter } from './storageAdapter'

const cache = {}

export class MemoryStorageAdapter implements StorageAdapter {
  getAll = async (): Promise<object> => {
    return cache
  }

  get = async (key: string): Promise<object | number | string | null> => {
    const item = cache[key]

    if (item == null) {
      return null
    }

    return item
  }

  set = async (key: string, value: object | number | string | null): Promise<void> => {
    cache[key] = value
  }

  remove = async (key: string): Promise<void> => {
    cache[key] = undefined
  }
}
