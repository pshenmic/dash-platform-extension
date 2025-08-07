import React from 'react'
import { Button, Text } from 'dash-ui/react'
import { cva } from 'class-variance-authority'

interface MenuItemProps {
  title: string
  description?: string
  icon?: React.ReactNode
  onClick?: () => void
  hasSubMenu?: boolean
  danger?: boolean
  disabled?: boolean
  isAccount?: boolean
}

const menuItemStyles = cva(
  'w-full flex items-center justify-between px-4 py-3 text-left transition-colors border-b border-white last:border-b-0',
  {
    variants: {
      variant: {
        default: 'bg-white/[0.03] hover:bg-white/[0.06]',
        danger: 'bg-white/[0.03] hover:bg-red-50 text-red-600',
        account: 'bg-white/[0.03] rounded-[15px] border-b-0 px-4 py-3'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
)

const ChevronRightIcon: React.FC = () => (
  <svg
    width='16'
    height='16'
    viewBox='0 0 16 16'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
  >
    <path
      d='M6 12L10 8L6 4'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
)

export const MenuItem: React.FC<MenuItemProps> = ({
  title,
  description,
  icon,
  onClick,
  hasSubMenu = false,
  danger = false,
  disabled = false,
  isAccount = false
}) => {
  const getVariant = () => {
    if (isAccount) return 'account'
    if (danger) return 'danger'
    return 'default'
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={menuItemStyles({
        variant: getVariant()
      })}
    >
      <div className='flex items-center gap-3'>
        {icon && (
          <div className={`flex-shrink-0 rounded-full bg-white flex items-center justify-center ${
            isAccount ? 'w-[50px] h-[50px]' : 'w-[35px] h-[35px]'
          }`}
          >
            <div className={isAccount ? 'w-6 h-6' : 'w-4 h-4'}>
              {icon}
            </div>
          </div>
        )}
        <div className='flex-1 text-left ml-4'>
          <Text
            size={isAccount ? 'base' : 'sm'}
            weight={isAccount ? '500' : 'medium'}
            className={danger ? 'text-red-600' : 'text-[#0C1C33]'}
          >
            {title}
          </Text>
          {description && (
            <Text
              size={isAccount ? 'xs' : 'xs'}
              className={danger ? 'text-red-500' : isAccount ? 'text-[#0C1C33]/50 font-light' : 'text-[#0C1C33]/70'}
            >
              {description}
            </Text>
          )}
        </div>
      </div>

      {hasSubMenu && (
        <div className='flex-shrink-0'>
          <ChevronRightIcon />
        </div>
      )}
    </button>
  )
}
