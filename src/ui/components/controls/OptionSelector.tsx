import React from 'react'
import { Text } from 'dash-ui-kit/react'

export interface OptionItem {
  id: string
  label: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  boldLabel?: string
}

interface OptionSelectorProps {
  options: OptionItem[]
  selectedId: string | null
  onOptionSelect: (id: string) => void
  className?: string
}

export const OptionSelector: React.FC<OptionSelectorProps> = ({
  options,
  selectedId,
  onOptionSelect,
  className = ''
}) => {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {options.map((option) => {
        const IconComponent = option.icon
        const isSelected = selectedId != null && selectedId === option.id

        return (
          <div
            key={option.id}
            onClick={() => onOptionSelect(option.id)}
            className={`flex items-center rounded-2xl px-6 py-3 cursor-pointer transition-all border-l-2 ${
              isSelected
                ? 'bg-dash-brand/15 border-dash-brand'
                : 'bg-dash-primary-dark-blue/[0.03] hover:bg-dash-primary-dark-blue/[0.08] border-transparent'
            }`}
          >
            {(IconComponent != null) && (
              <div className='flex items-center justify-center w-[34px] h-[34px] rounded-full bg-dash-brand/15 mr-[15px] flex-shrink-0'>
                <IconComponent
                  className={`w-4 h-4 ${isSelected ? 'text-dash-brand' : 'text-dash-brand'}`}
                />
              </div>
            )}
            <div className='flex-1'>
              <Text color={isSelected ? 'blue' : 'default'} weight='medium'>
                {(option.boldLabel !== null && option.boldLabel !== undefined) && <span className='font-bold'>{option.boldLabel}</span>}
                {(option.boldLabel !== null && option.boldLabel !== undefined) && ' '}
                {option.label}
              </Text>
              {(option.description !== null && option.description !== undefined) && (
                <Text size='sm' color={isSelected ? 'blue' : 'muted'} className='mt-1'>
                  {option.description}
                </Text>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
