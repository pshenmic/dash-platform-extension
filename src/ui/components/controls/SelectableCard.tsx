import React from 'react'
import { Text, ValueCard } from 'dash-ui-kit/react'

interface SelectableCardProps {
  selected: boolean
  onClick: () => void
  disabled?: boolean
  // Optional leading icon, rendered inside the standard brand-tinted circle.
  icon?: React.ReactNode
  // Regular-weight label text, optionally followed by a bold segment.
  label?: React.ReactNode
  boldLabel?: string
  description?: string
  // Fully custom body; when provided it replaces the label/description layout.
  children?: React.ReactNode
  className?: string
}

// A selectable card container matching the "Choose Wallet Type" style: a
// left-accent border, light-blue when selected, with an optional icon circle
// and a label/description block.
export const SelectableCard: React.FC<SelectableCardProps> = ({
  selected,
  onClick,
  disabled = false,
  icon,
  label,
  boldLabel,
  description,
  children,
  className = ''
}) => {
  return (
    <ValueCard
      onClick={() => { if (!disabled) onClick() }}
      disabled={disabled}
      colorScheme={selected ? 'lightBlue' : 'lightGray'}
      border={false}
      clickable={!disabled}
      className={`py-3 px-6 border-l-2 ${selected ? 'border-l-[#4C7EFF]' : 'border-l-transparent'} ${disabled ? 'opacity-40' : ''} ${className}`}
    >
      <div className='flex items-center gap-4'>
        {icon != null && (
          <div className='w-[2.125rem] h-[2.125rem] rounded-full flex items-center justify-center shrink-0 bg-[rgba(76,126,255,0.15)] text-[#4C7EFF]'>
            {icon}
          </div>
        )}

        {children ?? (
          <div className='flex flex-col gap-1'>
            {(label != null || boldLabel != null) && (
              <Text size='sm' className='text-[#0C1C33]'>
                {label}{boldLabel != null && <span className='font-extrabold'>{boldLabel}</span>}
              </Text>
            )}
            {description != null && (
              <Text size='xs' className='text-[rgba(12,28,51,0.5)] leading-tight'>
                {description}
              </Text>
            )}
          </div>
        )}
      </div>
    </ValueCard>
  )
}
