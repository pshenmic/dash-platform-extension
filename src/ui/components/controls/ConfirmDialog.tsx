import React, { useState, useEffect } from 'react'
import { Dialog, Button, Text, Input, EyeOpenIcon, EyeClosedIcon } from 'dash-ui-kit/react'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: (password?: string) => void | Promise<void>
  onCancel?: () => void
  passwordRequired?: boolean
  isLoading?: boolean
  error?: string | null
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onOpenChange,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  passwordRequired = false,
  isLoading = false,
  error = null
}) => {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setPassword('')
      setShowPassword(false)
      setLocalError(null)
    }
  }, [open])

  useEffect(() => {
    setLocalError(error ?? null)
  }, [error])

  const handleConfirm = (): void => {
    if (passwordRequired && password.trim() === '') {
      setLocalError('Password is required')
      return
    }

    void Promise.resolve(onConfirm(passwordRequired ? password : undefined)).then(() => {
      if (error == null && localError == null) {
        onOpenChange(false)
      }
    })
  }

  const handleCancel = (): void => {
    onCancel?.()
    onOpenChange(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && !isLoading) {
      handleConfirm()
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      className='w-[390px] max-w-[390px] border-0'
      title={title}
      size='md'
      showCloseButton
    >
      <div className='flex flex-col gap-6 -mx-6'>
        <div className='flex flex-col gap-4 px-6'>
          <Text size='md' className='text-gray-700 leading-relaxed'>
            {message}
          </Text>

          {passwordRequired && (
            <div className='flex flex-col gap-2'>
              <div className='relative'>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder='Your Password'
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setLocalError(null)
                  }}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  className='w-full pr-10'
                />
                <button
                  type='button'
                  onClick={() => setShowPassword(!showPassword)}
                  className='absolute right-4 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity'
                >
                  {showPassword
                    ? <EyeClosedIcon className='w-4 h-4' />
                    : <EyeOpenIcon className='w-4 h-4' />}
                </button>
              </div>

              {localError != null && (
                <Text size='sm' className='text-red-600'>
                  {localError}
                </Text>
              )}
            </div>
          )}
        </div>

        <div className='flex gap-3 px-6 pb-2'>
          <Button
            size='md'
            className='flex-1'
            onClick={handleCancel}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            colorScheme='red'
            size='md'
            className='flex-1'
            onClick={handleConfirm}
            disabled={isLoading || (passwordRequired && password.trim() === '')}
          >
            {isLoading ? 'Processing...' : confirmText}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
