import { StorageAdapter } from './storageAdapter'

export class ExtensionStorageAdapter implements StorageAdapter {
  get = async (key: string): Promise<object | string | number | null> => {
    const retrieved = await chrome.storage.local.get([key])

    if (retrieved[key] == null) {
      return null
    }

    return retrieved[key]
  }

  set = async (key: string, value: object | string | number): Promise<void> => {
    await chrome.storage.local.set({ [key]: value })
  }
}
