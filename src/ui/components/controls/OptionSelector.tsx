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
  selectedId: string
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
    <div className={`flex flex-col gap-3 ${className}`}>
      {options.map((option) => {
        const IconComponent = option.icon
        const isSelected = selectedId === option.id
        
        return (
          <div
            key={option.id}
            onClick={() => onOptionSelect(option.id)}
            className={`flex gap-4 items-center rounded-2xl px-6 py-4 cursor-pointer transition-all ${
              isSelected
                ? 'bg-dash-brand/15 border-l-2 border-dash-brand'
                : 'bg-dash-primary-dark-blue/[0.03] hover:bg-dash-primary-dark-blue/[0.08]'
            }`}
          >
            {IconComponent && (
              <IconComponent 
                className={`${isSelected ? 'text-dash-brand' : 'text-dash-primary-dark-blue'}`} 
              />
            )}
            <div className='flex-1'>
              <Text color={isSelected ? 'blue' : 'default'} weight='medium'>
                {option.boldLabel && <span className='font-bold'>{option.boldLabel}</span>}
                {option.boldLabel && ' '}
                {option.label}
              </Text>
              {option.description && (
                <Text size="sm" color={isSelected ? 'blue' : 'muted'} className='mt-1'>
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
