import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useExtensionAPI } from './useExtensionAPI'
import { buildLoginPath, isSessionUnlocked } from '../utils/lockSession'

export interface AccessControlConfig {
  requirePassword?: boolean
  requireWallet?: boolean
  // Screens that are themselves the way out of a locked session set this.
  allowLocked?: boolean
}

interface AccessControlState {
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
}

const DEFAULT_CONFIG: AccessControlConfig = {
  requirePassword: true,
  requireWallet: true,
  allowLocked: false
}

export function useAccessControl (config: Partial<AccessControlConfig> = {}): AccessControlState {
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const extensionAPI = useExtensionAPI()
  const [state, setState] = useState<AccessControlState>({
    isLoading: true,
    isAuthenticated: false,
    error: null
  })

  const finalConfig = { ...DEFAULT_CONFIG, ...config }

  // The check depends on the pathname only. Query params change while staying on
  // the same screen (multi-stage flows), and re-running would unmount the screen
  // and drop its state.
  const locationRef = useRef({ pathname, search })
  locationRef.current = { pathname, search }

  useEffect(() => {
    const checkAuth = async (): Promise<void> => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }))

        const status = await extensionAPI.getStatus()

        // Check password requirement
        if (finalConfig.requirePassword === true && !status.passwordSet) {
          void navigate('/setup-password')
          setState({ isLoading: false, isAuthenticated: false, error: null })
          return
        }

        // Check auto-lock
        if (finalConfig.allowLocked !== true && !await isSessionUnlocked()) {
          void navigate(buildLoginPath(locationRef.current.pathname, locationRef.current.search))
          setState({ isLoading: false, isAuthenticated: false, error: null })
          return
        }

        // Check wallet requirement
        if (finalConfig.requireWallet === true && (status.currentWalletId == null || status.currentWalletId === '')) {
          void navigate('/home')
          setState({ isLoading: false, isAuthenticated: false, error: null })
          return
        }

        setState({ isLoading: false, isAuthenticated: true, error: null })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Authentication check failed'
        setState({ isLoading: false, isAuthenticated: false, error: errorMessage })
      }
    }

    void checkAuth()
  }, [extensionAPI, navigate, pathname, finalConfig.requirePassword, finalConfig.requireWallet, finalConfig.allowLocked])

  return state
}
