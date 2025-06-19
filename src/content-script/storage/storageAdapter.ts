export interface StorageAdapter {
  get: (key: string) => Promise<object | number | string | null>
  set: (key: string, value: object | number | string | null) => Promise<void>
}
