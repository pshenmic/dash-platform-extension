const LOCAL_STORAGE_KEY = 'dash-platform-extension-storage'

const localStorageAdapter = {
  async get (): Promise<Record<string, string>> {
    const value = localStorage.getItem(LOCAL_STORAGE_KEY)

    if (value == null || value === '') {
      return {}
    }

    const decoded = JSON.parse(value)

    return Object.entries(decoded).reduce<Record<string, string>>((acc, [storeType, value]) => {
      return { ...acc, [storeType]: JSON.stringify(value) }
    }, {})
  },
  async set (object: Record<string, string>): Promise<void> {
    const [storeType] = Object.keys(object)

    const value = object[storeType] ?? '{}'
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ [storeType]: JSON.parse(value) }))
  },
  onChanged: {
    addListener: (): void => {}
  }
}

export const useChromeStorage = (): any => {
  if (chrome?.storage?.local == null) {
    return localStorageAdapter
  }

  return chrome.storage.local
}
