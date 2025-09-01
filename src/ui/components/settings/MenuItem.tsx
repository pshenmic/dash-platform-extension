import React from 'react'
import { Text, useTheme, ChevronIcon } from 'dash-ui/react'
import { cva } from 'class-variance-authority'

interface MenuItemProps {
  title: string | React.ReactNode
  icon?: React.ReactNode
  onClick?: () => void
  hasSubMenu?: boolean
  disabled?: boolean
}

const menuItemStyles = cva(
  'w-full flex items-center justify-between text-left transition-colors last:border-b-0 px-4 py-[0.625rem]',
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

export const MenuItem: React.FC<MenuItemProps> = ({
  title,
  icon,
  onClick,
  hasSubMenu = false,
  disabled = false
}) => {
  const { theme } = useTheme()
  const getVariant = (): 'disabled' | 'default' => {
    if (disabled) return 'disabled'
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
      <div className='flex items-center gap-4'>
        {(icon != null) && (
          <div className='flex-shrink-0 rounded-full flex items-center justify-center w-[35px] h-[35px] bg-white'>
            <div className='w-4 h-4 flex items-center justify-center'>
              {icon}
            </div>
          </div>
        )}
        <div className='flex-1 text-left'>
          <Text
            size='sm'
            weight='medium'
            className='text-dash-primary-dark-blue'
          >
            {title}
          </Text>
        </div>
      </div>

      {hasSubMenu && (
        <div className='flex-shrink-0'>
          <ChevronIcon className='-rotate-90 w-4 h-4' />
        </div>
      )}
    </button>
  )
}
