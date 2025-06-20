import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useExtensionAPI } from './useExtensionAPI'

interface AuthCheckState {
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
}

export function useAuthCheck (): AuthCheckState {
  const navigate = useNavigate()
  const extensionAPI = useExtensionAPI()
  const [state, setState] = useState<AuthCheckState>({
    isLoading: true,
    isAuthenticated: false,
    error: null
  })

  useEffect(() => {
    const checkAuth = async (): Promise<void> => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }))

        const status = await extensionAPI.getStatus()

        if (!status.passwordSet) {
          // Password not set - go to password setup
          void navigate('/setup-password')
          setState({ isLoading: false, isAuthenticated: false, error: null })
          return
        }

        if (status.currentWalletId == null || status.currentWalletId === '') {
          // Password set but wallet not created - go to login
          void navigate('/login')
          setState({ isLoading: false, isAuthenticated: false, error: null })
          return
        }

        // User is authenticated
        setState({ isLoading: false, isAuthenticated: true, error: null })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Authentication check failed'
        setState({ isLoading: false, isAuthenticated: false, error: errorMessage })
      }
    }

    void checkAuth()
  }, [extensionAPI, navigate])

  return state
}
