import React, { useEffect } from 'react'
import { Button, Text } from 'dash-ui/react'

interface OverlayMenuProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  showBackButton?: boolean
  onBack?: () => void
}

const CloseIcon: React.FC = () => (
  <svg
    width='20'
    height='20'
    viewBox='0 0 20 20'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
  >
    <path
      d='M15 5L5 15M5 5L15 15'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
)

const BackIcon: React.FC = () => (
  <svg
    width='20'
    height='20'
    viewBox='0 0 20 20'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
  >
    <path
      d='M12.5 15L7.5 10L12.5 5'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
)

export const OverlayMenu: React.FC<OverlayMenuProps> = ({
  isOpen,
  onClose,
  title,
  children,
  showBackButton = false,
  onBack
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Block background scroll
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className='fixed z-50 top-0 left-0 ml-auto w-full max-w-full h-full bg-white shadow-xl flex flex-col transform transition-transform duration-300 ease-in-out' style={{ background: 'linear-gradient(180deg, #F8F9FA 0%, #FFFFFF 100%)' }}>
      {/* Header */}
      <div className='flex items-center justify-between p-4'>
        <div className='flex items-center gap-3 flex-1'>
          {showBackButton && (onBack != null) && (
            <Button
              onClick={onBack}
              colorScheme='lightGray'
              size='sm'
              className='p-1'
            >
              <BackIcon />
            </Button>
          )}
          <Text size='xl' weight='500' className='text-[#0C1C33]'>
            {title}
          </Text>
        </div>

        <Button
          onClick={onClose}
          colorScheme='lightGray'
          size='sm'
          className='p-3 bg-white/[0.03] rounded-[15px]'
        >
          <CloseIcon />
        </Button>
      </div>

      {/* Content */}
      <div className='flex-1 overflow-y-auto px-4 pb-4'>
        {children}
      </div>
    </div>
  )
}
