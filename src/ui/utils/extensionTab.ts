// Opens extension UI in a browser tab instead of the popup.

const TAB_VIEW_QUERY = 'view=tab'
const OPEN_TABS_KEY = 'openExtensionTabs'

export type ExtensionTabKey = 'topup'

export const isTabView = (): boolean =>
  new URLSearchParams(window.location.search).get('view') === 'tab'

export const buildExtensionTabUrl = (hashPath: string): string =>
  chrome.runtime.getURL(`index.html?${TAB_VIEW_QUERY}#${hashPath}`)

const readOpenTabs = async (): Promise<Record<string, number>> => {
  if (chrome?.storage?.session == null) return {}

  try {
    const stored = await chrome.storage.session.get(OPEN_TABS_KEY)

    return (stored?.[OPEN_TABS_KEY] ?? {}) as Record<string, number>
  } catch {
    return {}
  }
}

const writeOpenTabs = async (openTabs: Record<string, number>): Promise<void> => {
  if (chrome?.storage?.session == null) return

  try {
    await chrome.storage.session.set({ [OPEN_TABS_KEY]: openTabs })
  } catch {}
}

const focusTab = async (tabId: number): Promise<boolean> => {
  try {
    const tab = await chrome.tabs.get(tabId)

    if (tab?.id == null) return false

    await chrome.tabs.update(tab.id, { active: true })

    if (chrome.windows != null && tab.windowId != null) {
      await chrome.windows.update(tab.windowId, { focused: true })
    }

    return true
  } catch {
    return false // tab was closed since we stored its id
  }
}

// Focuses the tab already open for this key instead of starting a second copy.
export const openExtensionTab = async (key: ExtensionTabKey, hashPath: string): Promise<void> => {
  const openTabs = await readOpenTabs()
  const existingTabId = openTabs[key]

  if (existingTabId != null && await focusTab(existingTabId)) {
    window.close()
    return
  }

  const tab = await chrome.tabs.create({ url: buildExtensionTabUrl(hashPath) })

  if (tab.id != null) {
    await writeOpenTabs({ ...openTabs, [key]: tab.id })
  }

  window.close()
}

export const closeCurrentExtensionTab = async (): Promise<void> => {
  try {
    const tab = await chrome.tabs.getCurrent()

    if (tab?.id != null) {
      await chrome.tabs.remove(tab.id)
    }
  } catch {}
}
