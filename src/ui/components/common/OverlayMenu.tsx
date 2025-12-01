import React, { useEffect } from 'react'
import { Button, Text, ChevronIcon, CrossIcon } from 'dash-ui-kit/react'

interface OverlayMenuProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  showBackButton?: boolean
  onBack?: () => void
}

export const OverlayMenu: React.FC<OverlayMenuProps> = ({
  isOpen,
  onClose,
  title,
  children,
  showBackButton = false,
  onBack
}) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className='fixed z-50 top-0 left-0 ml-auto w-full max-w-full h-full bg-white shadow-xl flex flex-col transform transition-transform duration-300 ease-in-out'>
      <div className='flex items-center justify-between p-4'>
        <div className='flex items-center gap-3 flex-1'>
          {showBackButton && (onBack != null) && (
            <Button
              onClick={onBack}
              colorScheme='lightGray'
              size='sm'
              className='p-1 w-12 h-12'
            >
              <ChevronIcon className='rotate-90' />
            </Button>
          )}
          <Text size='xl' weight='medium' className='text-dash-primary-dark-blue'>
            {title}
          </Text>
        </div>

        <Button
          onClick={onClose}
          colorScheme='lightGray'
          size='sm'
          className='p-3 bg-white/[0.03] rounded-[15px] w-12 h-12'
        >
          <CrossIcon />
        </Button>
      </div>

      <div className='flex-1 overflow-y-auto px-4 pb-4'>
        {children}
      </div>
    </div>
  )
}
