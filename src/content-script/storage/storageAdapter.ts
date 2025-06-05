export interface StorageAdapter {
    get(key: string) : Promise<object>
    set(key: string, value: object) : Promise<void>
}
