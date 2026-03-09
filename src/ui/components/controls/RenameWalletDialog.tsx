import React, { useState, useEffect } from 'react'
import { Dialog, Button, Text, Input } from 'dash-ui-kit/react'

interface RenameWalletDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentName: string
  onRename: (newName: string) => void | Promise<void>
  isLoading?: boolean
  error?: string | null
}

export const RenameWalletDialog: React.FC<RenameWalletDialogProps> = ({
  open,
  onOpenChange,
  currentName,
  onRename,
  isLoading = false,
  error = null
}) => {
  const [newName, setNewName] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setNewName(currentName)
    } else {
      setNewName('')
      setLocalError(null)
    }
  }, [open, currentName])

  useEffect(() => {
    setLocalError(error ?? null)
  }, [error])

  const handleConfirm = (): void => {
    const trimmed = newName.trim()
    if (trimmed === '') {
      setLocalError('Name cannot be empty')
      return
    }
    void Promise.resolve(onRename(trimmed))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && !isLoading) handleConfirm()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      className='w-[390px] max-w-[390px] border-0'
      title='Rename Wallet'
      size='md'
      showCloseButton
    >
      <div className='flex flex-col gap-6 -mx-6'>
        <div className='flex flex-col gap-4 px-6'>
          <Text size='md' className='text-gray-700 leading-relaxed'>
            Current name: <span className='font-medium text-gray-900'>{currentName}</span>
          </Text>

          <div className='flex flex-col gap-2'>
            <Input
              placeholder='New wallet name'
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value)
                setLocalError(null)
              }}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className='w-full'
            />

            {localError != null && (
              <Text size='sm' className='text-red-600'>
                {localError}
              </Text>
            )}
          </div>
        </div>

        <div className='flex gap-3 px-6 pb-2'>
          <Button
            size='md'
            className='flex-1'
            onClick={() => onOpenChange(false)}
            colorScheme='lightBlue'
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            colorScheme='brand'
            size='md'
            className='flex-1'
            onClick={handleConfirm}
            disabled={isLoading || newName.trim() === ''}
          >
            {isLoading ? 'Renaming...' : 'Rename'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
