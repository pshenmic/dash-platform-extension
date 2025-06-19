import { StorageAdapter } from './storageAdapter'

const cache = {}

export class MemoryStorageAdapter implements StorageAdapter {
  get = async (key: string): Promise<object> => {
    return cache[key] || {}
  }

  set = async (key: string, value: object): Promise<void> => {
    cache[key] = value
  }
}
