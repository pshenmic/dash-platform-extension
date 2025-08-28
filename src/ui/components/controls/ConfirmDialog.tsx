import React from 'react'
import { Dialog, Button, Text } from 'dash-ui/react'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel?: () => void
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
}) => {
  const handleConfirm = (): void => {
    onConfirm()
    onOpenChange(false)
  }

  const handleCancel = (): void => {
    onCancel?.()
    onOpenChange(false)
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
        <div className='px-6'>
          <Text size='md' className='text-gray-700 leading-relaxed'>
            {message}
          </Text>
        </div>
        
        <div className='flex gap-3 px-6 pb-2'>
          <Button
            size='md'
            className='flex-1'
            onClick={handleCancel}
          >
            {cancelText}
          </Button>
          <Button
            colorScheme='red'
            size='md'
            className='flex-1'
            onClick={handleConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
