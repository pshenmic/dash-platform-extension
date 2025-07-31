import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useExtensionAPI } from './useExtensionAPI'

export interface AccessControlConfig {
  requirePassword?: boolean
  requireWallet?: boolean
}

interface AccessControlState {
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
}

const DEFAULT_CONFIG: AccessControlConfig = {
  requirePassword: true,
  requireWallet: true
}

export function useAccessControl (config: Partial<AccessControlConfig> = {}): AccessControlState {
  const navigate = useNavigate()
  const extensionAPI = useExtensionAPI()
  const [state, setState] = useState<AccessControlState>({
    isLoading: true,
    isAuthenticated: false,
    error: null
  })

  const finalConfig = { ...DEFAULT_CONFIG, ...config }

  useEffect(() => {
    const checkAuth = async (): Promise<void> => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }))

        const status = await extensionAPI.getStatus()

        // Check password requirement
        if (finalConfig.requirePassword && !status.passwordSet) {
          void navigate('/setup-password')
          setState({ isLoading: false, isAuthenticated: false, error: null })
          return
        }

        // Check wallet requirement
        if (finalConfig.requireWallet && (status.currentWalletId == null || status.currentWalletId === '')) {
          void navigate('/no-wallet')
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
  }, [extensionAPI, navigate, finalConfig.requirePassword, finalConfig.requireWallet])

  return state
}
