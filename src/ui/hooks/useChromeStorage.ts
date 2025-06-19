const LOCAL_STORAGE_KEY = 'dash-platform-extension-storage'

const localStorageAdapter = {
  async get () {
    const value = localStorage.getItem(LOCAL_STORAGE_KEY)

    if (!value) {
      return {}
    }

    const decoded = JSON.parse(value)

    return Object.entries(decoded).reduce((acc, [storeType, value]) => {
      return { ...acc, [storeType]: JSON.stringify(value) }
    }, {})
  },
  async set (object) {
    const [storeType] = Object.keys(object)

    const value = object[storeType] || {}
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ [storeType]: JSON.parse(value) }))
  },
  onChanged: {
    addListener: () => {}
  }
}

export const useChromeStorage = () => {
  if (!chrome?.storage?.local) {
    return localStorageAdapter
  }

  return chrome.storage.local
}
