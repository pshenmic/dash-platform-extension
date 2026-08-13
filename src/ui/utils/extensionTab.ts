// Opens extension UI in a browser tab instead of the popup.

const TAB_VIEW_QUERY = 'view=tab'
const OPEN_TABS_KEY = 'openExtensionTabs'

export type ExtensionTabKey = 'topup'

export interface OpenExtensionTab {
  tabId: number
  identityId: string | null
  walletId: string | null
}

export const isTabView = (): boolean =>
  new URLSearchParams(window.location.search).get('view') === 'tab'

export const buildExtensionTabUrl = (hashPath: string): string =>
  chrome.runtime.getURL(`index.html?${TAB_VIEW_QUERY}#${hashPath}`)

const readOpenTabs = async (): Promise<Record<string, OpenExtensionTab>> => {
  if (chrome?.storage?.session == null) return {}

  try {
    const stored = await chrome.storage.session.get(OPEN_TABS_KEY)

    return (stored?.[OPEN_TABS_KEY] ?? {}) as Record<string, OpenExtensionTab>
  } catch {
    return {}
  }
}

const writeOpenTabs = async (openTabs: Record<string, OpenExtensionTab>): Promise<void> => {
  if (chrome?.storage?.session == null) return

  try {
    await chrome.storage.session.set({ [OPEN_TABS_KEY]: openTabs })
  } catch {}
}

// Returns the tab opened for this key, or null if it is gone.
export const findOpenExtensionTab = async (key: ExtensionTabKey): Promise<OpenExtensionTab | null> => {
  const entry = (await readOpenTabs())[key]

  if (entry?.tabId == null) return null

  try {
    await chrome.tabs.get(entry.tabId)

    return entry
  } catch {
    return null // tab was closed since we stored its id
  }
}

export const focusExtensionTab = async (tabId: number): Promise<void> => {
  try {
    const tab = await chrome.tabs.get(tabId)

    await chrome.tabs.update(tabId, { active: true })

    if (chrome.windows != null && tab.windowId != null) {
      await chrome.windows.update(tab.windowId, { focused: true })
    }
  } catch {}

  window.close()
}

export const openExtensionTab = async (
  key: ExtensionTabKey,
  hashPath: string,
  owner: Omit<OpenExtensionTab, 'tabId'>
): Promise<void> => {
  const openTabs = await readOpenTabs()
  const tab = await chrome.tabs.create({ url: buildExtensionTabUrl(hashPath) })

  if (tab.id != null) {
    await writeOpenTabs({ ...openTabs, [key]: { ...owner, tabId: tab.id } })
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
