import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AUTO_LOCK_CHECK_INTERVAL_MS, AUTO_LOCK_TOUCH_THROTTLE_MS } from '../../constants'
import { buildLoginPath, isPublicPath, isSessionUnlocked, touchSession } from '../utils/lockSession'

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'focus'] as const

// Keeps the session marker fresh while the user is active and locks an already
// open UI once the session goes stale. Mounted once, in Layout.
export const useAutoLock = (): void => {
  const navigate = useNavigate()
  const { pathname, search } = useLocation()

  // Events are caught on the document, so no screen has to report activity itself.
  useEffect(() => {
    let lastTouch = 0

    const onActivity = (): void => {
      const now = Date.now()

      if (now - lastTouch < AUTO_LOCK_TOUCH_THROTTLE_MS) return

      lastTouch = now
      void touchSession()
    }

    ACTIVITY_EVENTS.forEach(event => document.addEventListener(event, onActivity, true))

    return () => ACTIVITY_EVENTS.forEach(event => document.removeEventListener(event, onActivity, true))
  }, [])

  // Navigation counts as activity.
  useEffect(() => {
    void touchSession()
  }, [pathname])

  // Checks expiry without extending it, so an abandoned tab does lock.
  useEffect(() => {
    if (isPublicPath(pathname)) return

    const checkExpiry = async (): Promise<void> => {
      if (await isSessionUnlocked()) return

      void navigate(buildLoginPath(pathname, search))
    }

    const interval = setInterval(() => {
      checkExpiry().catch(e => console.log('checkExpiry error:', e))
    }, AUTO_LOCK_CHECK_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [pathname, search, navigate])
}
