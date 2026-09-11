import { ext } from '../platform'
import { StorageAdapter } from '../content-script/storage/storageAdapter'
import { STORAGE_MESSAGE, StorageOp, StorageRequest, StorageResponse } from './storageMessages'

/**
 * StorageAdapter for contexts without `chrome.storage` — i.e. Chrome's
 * offscreen document, which is granted only the `chrome.runtime` messaging
 * APIs. Each call is forwarded to the service worker, which does hold full
 * API access and performs the real `chrome.storage.local` operation.
 *
 * Implements the same interface as ExtensionStorageAdapter, so every
 * repository and handler is unaware of the difference.
 */
export class ProxyStorageAdapter implements StorageAdapter {
  private async call (op: StorageOp, key?: string, value?: object | number | string | null): Promise<any> {
    const request: StorageRequest = {
      context: 'dash-platform-extension',
      type: STORAGE_MESSAGE,
      op,
      key,
      value
    }

    const response: StorageResponse = await ext.runtime.sendMessage(request)

    if (response == null) {
      throw new Error(`Storage ${op} failed: no response from the extension service worker`)
    }

    if (!response.ok) {
      throw new Error(response.error ?? `Storage ${op} failed`)
    }

    return response.result
  }

  getAll = async (): Promise<object> => await this.call('getAll')

  get = async (key: string): Promise<object | number | string | null> => await this.call('get', key)

  set = async (key: string, value: object | number | string | null): Promise<void> => {
    await this.call('set', key, value)
  }

  remove = async (key: string): Promise<void> => {
    await this.call('remove', key)
  }
}
