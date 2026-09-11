// Auto-lock session marker.
//
// The marker lives in chrome.storage.session, which is in-memory and wiped when
// the browser closes, so a restart always asks for the password again. It is
// created only by unlockSession() after a successful password check; activity
// merely refreshes an already valid marker, never creates one.

import { AUTO_LOCK_TIMEOUT_MS } from '../../constants'

const LAST_ACTIVITY_KEY = 'lastActivityAt'

const hasSessionStorage = (): boolean => chrome?.storage?.session != null

// Opens the session after the password was verified.
export const unlockSession = async (): Promise<void> => {
  if (!hasSessionStorage()) return

  try {
    await chrome.storage.session.set({ [LAST_ACTIVITY_KEY]: Date.now() })
  } catch {}
}

// Closes the session, so the next check locks.
export const lockSession = async (): Promise<void> => {
  if (!hasSessionStorage()) return

  try {
    await chrome.storage.session.remove(LAST_ACTIVITY_KEY)
  } catch {}
}

// A missing, unreadable or expired marker counts as locked.
export const isSessionUnlocked = async (): Promise<boolean> => {
  if (!hasSessionStorage()) return false

  try {
    const stored = await chrome.storage.session.get(LAST_ACTIVITY_KEY)
    const lastActivityAt = stored?.[LAST_ACTIVITY_KEY]

    if (typeof lastActivityAt !== 'number') return false

    return Date.now() - lastActivityAt < AUTO_LOCK_TIMEOUT_MS
  } catch {
    return false
  }
}

// Extends an unlocked session; does nothing when it is already locked.
export const touchSession = async (): Promise<void> => {
  if (!await isSessionUnlocked()) return

  await unlockSession()
}

// Routes reachable without an unlocked session.
const PUBLIC_PATHS = ['/', '/login', '/setup-password']

export const isPublicPath = (pathname: string): boolean => PUBLIC_PATHS.includes(pathname)

// Path to send a locked user to, carrying where they were headed.
export const buildLoginPath = (pathname: string, search: string): string =>
  isPublicPath(pathname)
    ? '/login'
    : `/login?returnTo=${encodeURIComponent(`${pathname}${search}`)}`
