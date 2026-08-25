import React, { useState } from 'react'
import { useExtensionAPI } from './useExtensionAPI'

export interface UsePasswordCheck {
  verify: (password: string) => Promise<boolean>
  error: string | null
  setError: React.Dispatch<React.SetStateAction<string | null>>
  checking: boolean
}

export const usePasswordCheck = (): UsePasswordCheck => {
  const extensionAPI = useExtensionAPI()
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  const verify = async (password: string): Promise<boolean> => {
    if (password === '') {
      setError('Password must be provided')
      return false
    }

    setChecking(true)
    setError(null)

    try {
      const passwordCheck = await extensionAPI.checkPassword(password)
      if (!passwordCheck.success) {
        setError('Invalid password')
        return false
      }
      return true
    } finally {
      setChecking(false)
    }
  }

  return { verify, error, setError, checking }
}
