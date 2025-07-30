export interface StorageAdapter {
  getAll: () => Promise<object>
  get: (key: string) => Promise<object | number | string | null>
  set: (key: string, value: object | number | string | null) => Promise<void>
  remove: (key: string) => Promise<void>
}
