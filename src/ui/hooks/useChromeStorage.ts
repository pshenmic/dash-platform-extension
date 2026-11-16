const LOCAL_STORAGE_KEY = 'dash-extension-storage'
const LEGACY_LOCAL_STORAGE_KEY = 'dash-platform-extension-storage'

const migrateLegacyKey = (): string | null => {
  const legacy = localStorage.getItem(LEGACY_LOCAL_STORAGE_KEY)

  if (legacy == null) {
    return null
  }

  localStorage.setItem(LOCAL_STORAGE_KEY, legacy)
  localStorage.removeItem(LEGACY_LOCAL_STORAGE_KEY)

  return legacy
}

const localStorageAdapter = {
  async get (): Promise<Record<string, string>> {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY)

    const value = stored == null || stored === '' ? migrateLegacyKey() : stored

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
