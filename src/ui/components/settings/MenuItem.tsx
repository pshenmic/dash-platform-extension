import React from 'react'
import { Text, useTheme } from 'dash-ui/react'
import { cva } from 'class-variance-authority'

interface MenuItemProps {
  title: string | React.ReactNode
  icon?: React.ReactNode
  onClick?: () => void
  hasSubMenu?: boolean
  disabled?: boolean
  isAccount?: boolean
}

const menuItemStyles = cva(
  'w-full flex items-center justify-between text-left transition-colors last:border-b-0 px-[15px] py-[10px]',
  {
    variants: {
      variant: {
        default: 'hover:cursor-pointer',
        disabled: 'opacity-50 cursor-not-allowed',
        account: 'border-b-0 hover:cursor-pointer'
      },
      theme: {
        light: 'bg-[rgba(12,28,51,0.03)] border-b border-white',
        dark: 'bg-[rgba(255,255,255,0.05)] border-b border-[rgba(255,255,255,0.15)] backdrop-blur-[250px]'
      }
    },
    compoundVariants: [
      {
        variant: 'default',
        theme: 'light',
        class: 'hover:bg-[rgba(12,28,51,0.06)]'
      },
      {
        variant: 'default',
        theme: 'dark',
        class: 'hover:bg-[rgba(255,255,255,0.08)]'
      },
      {
        variant: 'account',
        theme: 'light',
        class: 'hover:bg-[rgba(12,28,51,0.06)]'
      },
      {
        variant: 'account',
        theme: 'dark',
        class: 'hover:bg-[rgba(255,255,255,0.08)]'
      }
    ],
    defaultVariants: {
      variant: 'default',
      theme: 'light'
    }
  }
)

const ChevronRightIcon: React.FC<{ theme?: 'light' | 'dark' }> = ({ theme = 'light' }) => (
  <svg
    width='16'
    height='16'
    viewBox='0 0 16 16'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
  >
    <path
      d='M6 12L10 8L6 4'
      stroke={theme === 'dark' ? '#FFFFFF' : '#0C1C33'}
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
)

export const MenuItem: React.FC<MenuItemProps> = ({
  title,
  icon,
  onClick,
  hasSubMenu = false,
  disabled = false,
  isAccount = false
}) => {
  const { theme } = useTheme()
  const getVariant = () => {
    if (disabled) return 'disabled'
    if (isAccount) return 'account'
    return 'default'
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={menuItemStyles({
        variant: getVariant(),
        theme
      })}
    >
      <div className='flex items-center gap-3'>
        {icon && (
          <div className={`flex-shrink-0 rounded-full flex items-center justify-center ${
            isAccount ? 'w-[50px] h-[50px]' : 'w-[35px] h-[35px]'
          } ${
            theme === 'dark' ? 'bg-[rgba(255,255,255,0.05)]' : 'bg-white'
          }`}
          >
            <div className={isAccount ? 'w-6 h-6' : 'w-4 h-4'}>
              {icon}
            </div>
          </div>
        )}
        <div className='flex-1 text-left ml-[15px]'>
          <Text
            size={isAccount ? 'base' : 'sm'}
            weight={isAccount ? '500' : 'medium'}
            className={theme === 'dark' ? 'text-white' : 'text-[#0C1C33]'}
          >
            {title}
          </Text>
        </div>
      </div>

      {hasSubMenu && (
        <div className='flex-shrink-0'>
          <ChevronRightIcon theme={theme} />
        </div>
      )}
    </button>
  )
}
